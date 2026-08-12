import { useEffect, useRef, useState } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { useUiStore } from '@/store/uiStore';
import { Button } from './Button';
import { Sheet } from './Sheet';

export function esCampoDeTexto(objetivo: EventTarget | null): boolean {
  const elemento = objetivo as HTMLElement | null;
  if (!elemento) return false;
  if (elemento.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName);
}

export function QuickCapture() {
  const abierta = useUiStore((estado) => estado.capturaAbierta);
  const abrir = useUiStore((estado) => estado.abrirCaptura);
  const cerrar = useUiStore((estado) => estado.cerrarCaptura);
  const [texto, setTexto] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'c' || evento.metaKey || evento.ctrlKey || evento.altKey) return;
      if (esCampoDeTexto(evento.target)) return;
      evento.preventDefault();
      abrir();
    };

    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abrir]);

  useEffect(() => {
    if (abierta) campo.current?.focus();
    else setTexto('');
  }, [abierta]);

  async function guardar(): Promise<void> {
    const limpio = texto.trim();
    if (limpio === '') return;

    await nodesRepo.create({ text: limpio });
    setTexto('');
    setConfirmacion('Idea guardada en tu canvas.');
    cerrar();
    window.setTimeout(() => setConfirmacion(''), 4000);
  }

  return (
    <>
      <Sheet abierta={abierta} titulo="Capturar idea" onClose={cerrar}>
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            void guardar();
          }}
          className="flex flex-col gap-4"
        >
          <input
            ref={campo}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            aria-label="¿Qué tenés en la cabeza?"
            placeholder="¿Qué tenés en la cabeza?"
            className="min-h-14 w-full rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-4 text-[length:var(--text-body-lg)] text-on-surface outline-none focus-visible:border-primary"
          />
          <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
            No hace falta fecha ni categoría. Después decidís qué hacer con esto.
          </p>
          <Button type="submit" size="lg">
            Guardar
          </Button>
        </form>
      </Sheet>

      <p role="status" aria-live="polite" className="sr-only">
        {confirmacion}
      </p>
    </>
  );
}
