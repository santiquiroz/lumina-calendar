// Comparación semántica de versiones. Tolera el prefijo "v" de las etiquetas de
// git y los sufijos de precompilación ("1.2.0-rc1"), que no participan del orden.
function parse(version: string): number[] | null {
  const nucleo = version.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
  const partes = nucleo.split('.');
  if (partes.length === 0 || nucleo === '') return null;

  const numeros: number[] = [];
  for (const parte of partes) {
    if (!/^\d+$/.test(parte)) return null;
    numeros.push(Number(parte));
  }
  return numeros;
}

export function isNewer(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (a === null || b === null) return false;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}
