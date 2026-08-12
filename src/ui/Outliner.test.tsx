import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import { indexNodes, MAX_DEPTH } from '@/domain/tree';
import { useAllNodes } from '@/hooks/useNodes';
import { buildNode } from '@/test/factories';
import { limpiarBase, renderConRuta } from '@/test/render';
import { filasVisibles, Outliner } from './Outliner';

beforeEach(limpiarBase);

function OutlinerVivo({ rootId }: { rootId: string }) {
  const nodos = useAllNodes();
  return <Outliner rootId={rootId} index={indexNodes(nodos)} />;
}

async function sembrarCarpetaConDosTareas(): Promise<string> {
  const raiz = await nodesRepo.create({ text: 'Carpeta' });
  await nodesRepo.create({ text: 'Primera', parentId: raiz.id });
  await nodesRepo.create({ text: 'Segunda', parentId: raiz.id });
  return raiz.id;
}

describe('filasVisibles', () => {
  it('oculta los hijos de un nodo colapsado', () => {
    const index = indexNodes([
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', collapsed: true }),
      buildNode({ id: 'a1', parentId: 'a' }),
    ]);
    expect(filasVisibles(index, 'r').map((f) => f.node.id)).toEqual(['a']);
  });

  it('asigna el nivel según la profundidad relativa a la raíz', () => {
    const index = indexNodes([
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r' }),
      buildNode({ id: 'a1', parentId: 'a' }),
    ]);
    expect(filasVisibles(index, 'r').map((f) => f.nivel)).toEqual([0, 1]);
  });

  it('marca qué filas tienen hijos', () => {
    const index = indexNodes([
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r' }),
      buildNode({ id: 'a1', parentId: 'a' }),
    ]);
    expect(filasVisibles(index, 'r').map((f) => f.tieneHijos)).toEqual([true, false]);
  });
});

describe('Outliner', () => {
  it('expone el árbol con roles y niveles accesibles', async () => {
    const rootId = await sembrarCarpetaConDosTareas();
    renderConRuta(<OutlinerVivo rootId={rootId} />);

    await screen.findByText('Primera');
    expect(screen.getByRole('tree', { name: 'Subtareas' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    expect(screen.getAllByRole('treeitem')[0]).toHaveAttribute('aria-level', '1');
  });

  it('indenta una fila bajo su hermana anterior con Tab', async () => {
    const usuario = userEvent.setup();
    const rootId = await sembrarCarpetaConDosTareas();
    renderConRuta(<OutlinerVivo rootId={rootId} />);

    const segunda = await screen.findByLabelText('Texto de la tarea Segunda');
    segunda.focus();
    await usuario.keyboard('{Tab}');

    await waitFor(async () => {
      const nodos = await db.nodes.toArray();
      const primera = nodos.find((n) => n.text === 'Primera');
      expect(nodos.find((n) => n.text === 'Segunda')?.parentId).toBe(primera?.id);
    });
  });

  it('no hace nada al indentar la primera fila', async () => {
    const usuario = userEvent.setup();
    const rootId = await sembrarCarpetaConDosTareas();
    renderConRuta(<OutlinerVivo rootId={rootId} />);

    const primera = await screen.findByLabelText('Texto de la tarea Primera');
    primera.focus();
    await usuario.keyboard('{Tab}');

    const nodos = await db.nodes.toArray();
    expect(nodos.find((n) => n.text === 'Primera')?.parentId).toBe(rootId);
  });

  it('marca la tarea como completada con Ctrl+Enter', async () => {
    const usuario = userEvent.setup();
    const rootId = await sembrarCarpetaConDosTareas();
    renderConRuta(<OutlinerVivo rootId={rootId} />);

    const primera = await screen.findByLabelText('Texto de la tarea Primera');
    primera.focus();
    await usuario.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(async () => {
      const nodos = await db.nodes.toArray();
      expect(nodos.find((n) => n.text === 'Primera')?.done).toBe(true);
    });
  });

  it('crea una hermana nueva con Enter', async () => {
    const usuario = userEvent.setup();
    const rootId = await sembrarCarpetaConDosTareas();
    renderConRuta(<OutlinerVivo rootId={rootId} />);

    const primera = await screen.findByLabelText('Texto de la tarea Primera');
    primera.focus();
    await usuario.keyboard('{Enter}');

    await waitFor(async () => expect(await db.nodes.count()).toBe(4));
  });

  it('avisa sin romperse cuando se alcanza el límite de anidación', async () => {
    const usuario = userEvent.setup();
    const raiz = await nodesRepo.create({ text: 'Carpeta' });

    let padreId = raiz.id;
    let abueloId = raiz.id;
    for (let i = 0; i < MAX_DEPTH; i += 1) {
      const nodo = await nodesRepo.create({ text: `Nivel ${i}`, parentId: padreId });
      abueloId = padreId;
      padreId = nodo.id;
    }
    await nodesRepo.create({ text: 'Sobrante', parentId: abueloId });

    renderConRuta(<OutlinerVivo rootId={raiz.id} />);

    const sobrante = await screen.findByLabelText('Texto de la tarea Sobrante');
    sobrante.focus();
    await usuario.keyboard('{Tab}');

    expect(await screen.findByRole('status')).toHaveTextContent(/límite de 20 niveles/i);
  });
});
