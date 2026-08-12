import { useState, type KeyboardEvent } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { DomainError } from '@/domain/errors';
import { MAX_DEPTH, type TreeIndex } from '@/domain/tree';
import type { LuminaNode, NodeId } from '@/domain/types';
import { OutlinerRow } from './OutlinerRow';

export interface OutlinerProps {
  rootId: NodeId;
  index: TreeIndex;
}

interface FilaVisible {
  node: LuminaNode;
  nivel: number;
  tieneHijos: boolean;
}

export function filasVisibles(index: TreeIndex, rootId: NodeId): FilaVisible[] {
  const salida: FilaVisible[] = [];

  const recorrer = (parentId: NodeId, nivel: number): void => {
    for (const hijo of index.childrenOf(parentId)) {
      const tieneHijos = index.childrenOf(hijo.id).length > 0;
      salida.push({ node: hijo, nivel, tieneHijos });
      if (tieneHijos && !hijo.collapsed) recorrer(hijo.id, nivel + 1);
    }
  };

  recorrer(rootId, 0);
  return salida;
}

export function Outliner({ rootId, index }: OutlinerProps) {
  const [enfocado, setEnfocado] = useState<NodeId | null>(null);
  const [aviso, setAviso] = useState('');
  const filas = filasVisibles(index, rootId);

  function anunciar(mensaje: string): void {
    setAviso(mensaje);
    window.setTimeout(() => setAviso(''), 4000);
  }

  async function crearHermano(fila: FilaVisible): Promise<void> {
    const padre = fila.node.parentId ?? rootId;
    const nuevo = await nodesRepo.create({
      text: '',
      parentId: padre,
      afterId: fila.node.id,
    });
    setEnfocado(nuevo.id);
  }

  async function indentar(posicion: number): Promise<void> {
    const fila = filas[posicion];
    const anterior = filas
      .slice(0, posicion)
      .reverse()
      .find((candidata) => candidata.nivel === fila.nivel);
    if (!anterior) return;

    try {
      await nodesRepo.move(fila.node.id, anterior.node.id);
    } catch (fallo) {
      if (fallo instanceof DomainError && fallo.code === 'MAX_DEPTH') {
        anunciar(`Llegaste al límite de ${MAX_DEPTH} niveles de anidación.`);
        return;
      }
      throw fallo;
    }
  }

  async function desindentar(fila: FilaVisible): Promise<void> {
    if (fila.nivel === 0) return;
    const padre = fila.node.parentId ? index.byId.get(fila.node.parentId) : undefined;
    if (!padre) return;
    await nodesRepo.move(fila.node.id, padre.parentId ?? rootId, { afterId: padre.id });
  }

  function moverFoco(posicion: number, delta: number): void {
    const destino = filas[posicion + delta];
    if (destino) setEnfocado(destino.node.id);
  }

  function alPresionar(evento: KeyboardEvent<HTMLDivElement>, posicion: number): void {
    const fila = filas[posicion];

    if (evento.key === 'Enter' && !evento.shiftKey && !evento.metaKey && !evento.ctrlKey) {
      evento.preventDefault();
      void crearHermano(fila);
      return;
    }

    if (evento.key === 'Enter' && (evento.metaKey || evento.ctrlKey)) {
      evento.preventDefault();
      void nodesRepo.toggleDone(fila.node.id);
      return;
    }

    if (evento.key === 'Tab') {
      evento.preventDefault();
      void (evento.shiftKey ? desindentar(fila) : indentar(posicion));
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      moverFoco(posicion, 1);
      return;
    }

    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      moverFoco(posicion, -1);
      return;
    }

    if (evento.key === 'Backspace' && (evento.currentTarget.textContent ?? '') === '') {
      evento.preventDefault();
      moverFoco(posicion, -1);
      void nodesRepo.softDelete(fila.node.id);
    }
  }

  return (
    <div className="flex flex-col">
      <div role="tree" aria-label="Subtareas" className="flex flex-col">
        {filas.map((fila, posicion) => (
          <OutlinerRow
            key={fila.node.id}
            node={fila.node}
            nivel={fila.nivel}
            tieneHijos={fila.tieneHijos}
            enfocado={enfocado === fila.node.id}
            onFocus={() => setEnfocado(fila.node.id)}
            onToggleDone={() => void nodesRepo.toggleDone(fila.node.id)}
            onToggleCollapsed={() =>
              void nodesRepo.update(fila.node.id, { collapsed: !fila.node.collapsed })
            }
            onChangeText={(texto) => {
              if (texto !== fila.node.text) void nodesRepo.update(fila.node.id, { text: texto });
            }}
            onKeyDown={(evento) => alPresionar(evento, posicion)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void nodesRepo.create({ text: '', parentId: rootId })}
        className="mt-2 min-h-11 self-start rounded-[length:var(--radius-md)] px-3 text-[length:var(--text-body-sm)] text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
      >
        + Agregar subtarea
      </button>

      <p role="status" aria-live="polite" className="mt-2 text-[length:var(--text-label-sm)] text-amber">
        {aviso}
      </p>
    </div>
  );
}
