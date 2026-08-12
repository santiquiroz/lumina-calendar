import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAncestors, useSearch } from '@/hooks/useNodes';
import type { LuminaNode } from '@/domain/types';
import { EmptyState } from '@/ui/EmptyState';
import { IconSearch } from '@/ui/icons';

const REBOTE_MS = 200;

export function SearchView() {
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState('');
  const resultados = useSearch(consulta);

  useEffect(() => {
    const id = window.setTimeout(() => setConsulta(texto), REBOTE_MS);
    return () => window.clearTimeout(id);
  }, [texto]);

  return (
    <section aria-labelledby="titulo-buscar" className="px-4 py-4">
      <h1
        id="titulo-buscar"
        className="mb-3 text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
      >
        Buscar
      </h1>

      <input
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        aria-label="Buscar en tus ideas y tareas"
        placeholder="Buscar en tus ideas y tareas"
        className="min-h-12 w-full rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-4 text-on-surface outline-none focus-visible:border-primary"
      />

      {consulta.trim() === '' ? (
        <EmptyState
          icono={<IconSearch size={32} />}
          titulo="Buscá lo que necesites"
          descripcion="Escribí una palabra y te muestro dónde vive, sin importar cuán adentro esté anidada."
        />
      ) : resultados.length === 0 ? (
        <EmptyState
          titulo="Nada con esas palabras"
          descripcion="Probá con otra palabra o revisá el Idea Canvas."
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {resultados.map((nodo) => (
            <li key={nodo.id}>
              <ResultadoBusqueda nodo={nodo} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultadoBusqueda({ nodo }: { nodo: LuminaNode }) {
  const ancestros = useAncestors(nodo.id);
  const ruta = ancestros.map((a) => a.text || 'Sin título').join(' › ');

  return (
    <Link
      to={`/nodo/${nodo.id}`}
      className="flex flex-col gap-1 rounded-[length:var(--radius-md)] bg-surface-lowest px-3 py-3 transition-colors hover:bg-surface-low"
    >
      <span className="text-on-surface">{nodo.text || 'Sin título'}</span>
      {ruta ? (
        <span className="truncate text-[length:var(--text-label-sm)] text-on-surface-variant">
          {ruta}
        </span>
      ) : null}
    </Link>
  );
}
