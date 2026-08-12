export const AUTORES = 'Diego Luis Álvarez García y Santiago Quiroz Upegui';

export function AttributionNotice() {
  return (
    <section
      aria-label="Atribución"
      className="rounded-[length:var(--radius-lg)] border border-outline-variant/50 bg-surface-low px-4 py-3 text-[length:var(--text-body-sm)] text-on-surface-variant"
    >
      <p className="font-semibold text-on-surface">Lumina Calendar</p>
      <p>Creado por {AUTORES}.</p>
      <p className="mt-2">
        Software libre bajo licencia AGPL-3.0 con un término adicional de atribución: este aviso debe
        conservarse visible en cualquier copia, obra derivada o despliegue.
      </p>
    </section>
  );
}
