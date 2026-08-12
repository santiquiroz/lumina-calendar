export const ORDER_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const BASE = ORDER_ALPHABET.length;
const MENOR = ORDER_ALPHABET[0];

function digito(caracter: string): number {
  const indice = ORDER_ALPHABET.indexOf(caracter);
  if (indice < 0) throw new RangeError(`Carácter de orden inválido: ${caracter}`);
  return indice;
}

// Una clave nunca termina en el carácter menor: esa es la invariante que
// garantiza que siempre quede espacio para insertar por debajo de ella.
function validar(clave: string, etiqueta: string): void {
  for (const caracter of clave) digito(caracter);
  if (clave.endsWith(MENOR)) {
    throw new RangeError(`La clave ${etiqueta} no puede terminar en "${MENOR}": ${clave}`);
  }
}

function midpoint(lower: string, upper: string | null): string {
  if (upper !== null) {
    let comun = 0;
    while ((lower[comun] ?? MENOR) === upper[comun]) comun += 1;
    if (comun > 0) {
      return upper.slice(0, comun) + midpoint(lower.slice(comun), upper.slice(comun));
    }
  }

  const digitoBajo = lower.length > 0 ? digito(lower[0]) : 0;
  const digitoAlto = upper !== null && upper.length > 0 ? digito(upper[0]) : BASE;

  if (digitoAlto - digitoBajo > 1) {
    return ORDER_ALPHABET[Math.round(0.5 * (digitoBajo + digitoAlto))];
  }

  if (upper !== null && upper.length > 1) return upper.slice(0, 1);

  return ORDER_ALPHABET[digitoBajo] + midpoint(lower.slice(1), null);
}

export function orderBetween(before: string | null, after: string | null): string {
  const lower = before ?? '';
  const upper = after;

  if (lower !== '') validar(lower, 'anterior');
  if (upper !== null) validar(upper, 'siguiente');

  if (upper !== null && lower >= upper) {
    throw new RangeError(`Límites de orden invertidos: "${lower}" >= "${upper}"`);
  }

  return midpoint(lower, upper);
}
