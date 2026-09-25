export type Frecuencia = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface DiaDeLaSemana {
  dia: number;
  ordinal: number;
}

export interface ReglaRecurrencia {
  frecuencia: Frecuencia;
  intervalo: number;
  conteo: number | null;
  hasta: string | null;
  porDia: DiaDeLaSemana[];
  porDiaDelMes: number[];
  porMes: number[];
  inicioSemana: number;
}

interface Periodo {
  primerDia: number;
  candidatos: number[];
}

const MS_DIA = 86_400_000;
const LUNES = 1;
// Resguardo para reglas que nunca coinciden (p. ej. el 30 de febrero): sin él,
// buscar la siguiente fecha no terminaría.
const MAX_PERIODOS = 100_000;

const FRECUENCIAS: readonly string[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const CODIGOS_DIA = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const PARTES_SOPORTADAS = new Set([
  'FREQ',
  'INTERVAL',
  'COUNT',
  'UNTIL',
  'BYDAY',
  'BYMONTHDAY',
  'BYMONTH',
  'WKST',
]);
const PATRON_DIA = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/;
const PATRON_ENTERO = /^[+-]?\d+$/;

export function parseRrule(valor: string): ReglaRecurrencia | null {
  const partes = leerPartes(valor);
  if (partes === null) return null;

  const frecuencia = partes.get('FREQ') ?? '';
  if (!esFrecuencia(frecuencia)) return null;

  const intervalo = leerEntero(partes.get('INTERVAL') ?? '1', 1, Infinity);
  const conteo = leerConteo(partes.get('COUNT'));
  const porDia = leerLista(partes.get('BYDAY'), (texto) => leerDia(texto, frecuencia));
  const porDiaDelMes = leerLista(partes.get('BYMONTHDAY'), leerDiaDelMes);
  const porMes = leerLista(partes.get('BYMONTH'), (texto) => leerEntero(texto, 1, 12));
  const inicioSemana = partes.has('WKST') ? CODIGOS_DIA.indexOf(partes.get('WKST') ?? '') : LUNES;

  if (intervalo === null || conteo === undefined) return null;
  if (porDia === null || porDiaDelMes === null || porMes === null || inicioSemana < 0) return null;

  return {
    frecuencia,
    intervalo,
    conteo,
    hasta: partes.get('UNTIL') ?? null,
    porDia,
    porDiaDelMes,
    porMes,
    inicioSemana,
  };
}

function leerPartes(valor: string): Map<string, string> | null {
  const partes = new Map<string, string>();
  for (const trozo of valor.trim().toUpperCase().split(';')) {
    if (trozo === '') continue;
    const [clave, contenido] = trozo.split('=', 2);
    if (!PARTES_SOPORTADAS.has(clave) || contenido === undefined) return null;
    partes.set(clave, contenido);
  }
  return partes;
}

function esFrecuencia(valor: string): valor is Frecuencia {
  return FRECUENCIAS.includes(valor);
}

function leerEntero(texto: string, minimo: number, maximo: number): number | null {
  if (!PATRON_ENTERO.test(texto)) return null;
  const numero = Number(texto);
  return numero >= minimo && numero <= maximo ? numero : null;
}

// undefined distingue un COUNT ilegible de uno ausente (null).
function leerConteo(texto: string | undefined): number | null | undefined {
  if (texto === undefined) return null;
  return leerEntero(texto, 1, Infinity) ?? undefined;
}

function leerDiaDelMes(texto: string): number | null {
  const dia = leerEntero(texto, -31, 31);
  return dia === 0 ? null : dia;
}

// El ordinal ("2TU", "-1FR") solo tiene sentido dentro de un mes o de un año.
function leerDia(texto: string, frecuencia: Frecuencia): DiaDeLaSemana | null {
  const campos = PATRON_DIA.exec(texto);
  if (campos === null) return null;

  const ordinal = campos[1] === undefined ? 0 : leerOrdinal(campos[1]);
  if (ordinal === null) return null;
  if (ordinal !== 0 && (frecuencia === 'DAILY' || frecuencia === 'WEEKLY')) return null;

  return { dia: CODIGOS_DIA.indexOf(campos[2]), ordinal };
}

function leerOrdinal(texto: string): number | null {
  const ordinal = leerEntero(texto, -53, 53);
  return ordinal === 0 ? null : ordinal;
}

function leerLista<T>(texto: string | undefined, lector: (trozo: string) => T | null): T[] | null {
  if (texto === undefined) return [];
  const valores: T[] = [];
  for (const trozo of texto.split(',')) {
    const valor = lector(trozo);
    if (valor === null) return null;
    valores.push(valor);
  }
  return valores;
}

export function diaCivil(anio: number, mes: number, dia: number): number {
  const fecha = new Date(0);
  fecha.setUTCFullYear(anio, mes - 1, dia);
  return Math.floor(fecha.getTime() / MS_DIA);
}

export function fechaCivil(dia: number): [number, number, number] {
  const fecha = new Date(dia * MS_DIA);
  return [fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate()];
}

// El día 0 (1 de enero de 1970) fue jueves; 0 es domingo, como en BYDAY.
export function diaDeLaSemana(dia: number): number {
  return (((dia + 4) % 7) + 7) % 7;
}

export function* diasDeLaRegla(
  regla: ReglaRecurrencia,
  inicioDia: number,
  limiteDia: number,
): Generator<number> {
  for (let indice = 0; indice < MAX_PERIODOS; indice += 1) {
    const periodo = periodoDeLaRegla(regla, inicioDia, indice);
    if (periodo.primerDia > limiteDia) return;
    yield* periodo.candidatos.filter((dia) => dia >= inicioDia);
  }
}

function periodoDeLaRegla(regla: ReglaRecurrencia, inicioDia: number, indice: number): Periodo {
  const salto = indice * regla.intervalo;
  const periodo = construirPeriodo(regla, inicioDia, salto);
  const candidatos = periodo.candidatos.filter((dia) => cumpleLimites(regla, dia));
  return { primerDia: periodo.primerDia, candidatos: ordenarSinRepetir(candidatos) };
}

function construirPeriodo(regla: ReglaRecurrencia, inicioDia: number, salto: number): Periodo {
  if (regla.frecuencia === 'DAILY') return periodoDiario(inicioDia, salto);
  if (regla.frecuencia === 'WEEKLY') return periodoSemanal(regla, inicioDia, salto);
  if (regla.frecuencia === 'MONTHLY') return periodoMensual(regla, inicioDia, salto);
  return periodoAnual(regla, inicioDia, salto);
}

function periodoDiario(inicioDia: number, salto: number): Periodo {
  const dia = inicioDia + salto;
  return { primerDia: dia, candidatos: [dia] };
}

function periodoSemanal(regla: ReglaRecurrencia, inicioDia: number, salto: number): Periodo {
  const retroceso = (diaDeLaSemana(inicioDia) - regla.inicioSemana + 7) % 7;
  const primerDia = inicioDia - retroceso + 7 * salto;
  const semana = Array.from({ length: 7 }, (_valor, desplazamiento) => primerDia + desplazamiento);
  const dias =
    regla.porDia.length > 0 ? regla.porDia.map((d) => d.dia) : [diaDeLaSemana(inicioDia)];
  return { primerDia, candidatos: semana.filter((dia) => dias.includes(diaDeLaSemana(dia))) };
}

function periodoMensual(regla: ReglaRecurrencia, inicioDia: number, salto: number): Periodo {
  const [anio, mes, diaDelMes] = fechaCivil(inicioDia);
  const primerDia = diaCivil(anio, mes + salto, 1);
  const [anioPeriodo, mesPeriodo] = fechaCivil(primerDia);
  return { primerDia, candidatos: diasDelMes(regla, anioPeriodo, mesPeriodo, diaDelMes) };
}

function periodoAnual(regla: ReglaRecurrencia, inicioDia: number, salto: number): Periodo {
  const [anioInicio, mesInicio, diaDelMes] = fechaCivil(inicioDia);
  const anio = anioInicio + salto;
  return {
    primerDia: diaCivil(anio, 1, 1),
    candidatos: diasDelAnio(regla, anio, mesInicio, diaDelMes),
  };
}

function diasDelAnio(
  regla: ReglaRecurrencia,
  anio: number,
  mesInicio: number,
  diaDelMes: number,
): number[] {
  if (usaDiasDeSemanaDelAnio(regla)) {
    return diasDeSemanaEnRango(diaCivil(anio, 1, 1), diaCivil(anio + 1, 1, 1) - 1, regla.porDia);
  }
  return mesesDelAnio(regla, mesInicio).flatMap((mes) => diasDelMes(regla, anio, mes, diaDelMes));
}

// En una regla anual sin BYMONTH ni BYMONTHDAY, BYDAY cuenta dentro del año
// entero ("1MO" es el primer lunes del año, no de cada mes).
function usaDiasDeSemanaDelAnio(regla: ReglaRecurrencia): boolean {
  return regla.porDia.length > 0 && regla.porMes.length === 0 && regla.porDiaDelMes.length === 0;
}

function mesesDelAnio(regla: ReglaRecurrencia, mesInicio: number): number[] {
  if (regla.porMes.length > 0) return regla.porMes;
  if (regla.porDiaDelMes.length > 0)
    return Array.from({ length: 12 }, (_valor, indice) => indice + 1);
  return [mesInicio];
}

function diasDelMes(
  regla: ReglaRecurrencia,
  anio: number,
  mes: number,
  diaDelMes: number,
): number[] {
  const primero = diaCivil(anio, mes, 1);
  const ultimo = diaCivil(anio, mes + 1, 1) - 1;

  if (regla.porDiaDelMes.length > 0) {
    return regla.porDiaDelMes.map((dia) => diaDelMesPedido(primero, ultimo, dia)).filter(esDia);
  }
  if (regla.porDia.length > 0) return diasDeSemanaEnRango(primero, ultimo, regla.porDia);
  return [diaDelMesPedido(primero, ultimo, diaDelMes)].filter(esDia);
}

function diaDelMesPedido(primero: number, ultimo: number, dia: number): number | null {
  const resultado = dia > 0 ? primero + dia - 1 : ultimo + dia + 1;
  return resultado >= primero && resultado <= ultimo ? resultado : null;
}

function esDia(dia: number | null): dia is number {
  return dia !== null;
}

function diasDeSemanaEnRango(primero: number, ultimo: number, porDia: DiaDeLaSemana[]): number[] {
  return porDia.flatMap((pedido) => {
    const coincidencias = diasConDiaDeLaSemana(primero, ultimo, pedido.dia);
    return pedido.ordinal === 0 ? coincidencias : elegirOrdinal(coincidencias, pedido.ordinal);
  });
}

function diasConDiaDeLaSemana(primero: number, ultimo: number, diaSemana: number): number[] {
  const dias: number[] = [];
  const desde = primero + ((diaSemana - diaDeLaSemana(primero) + 7) % 7);
  for (let dia = desde; dia <= ultimo; dia += 7) dias.push(dia);
  return dias;
}

function elegirOrdinal(dias: number[], ordinal: number): number[] {
  const elegido = ordinal > 0 ? dias[ordinal - 1] : dias[dias.length + ordinal];
  return elegido === undefined ? [] : [elegido];
}

function cumpleLimites(regla: ReglaRecurrencia, dia: number): boolean {
  const [, mes] = fechaCivil(dia);
  if (regla.porMes.length > 0 && !regla.porMes.includes(mes)) return false;
  if (regla.porDiaDelMes.length > 0 && !coincideDiaDelMes(regla.porDiaDelMes, dia)) return false;
  return (
    regla.porDia.length === 0 || regla.porDia.some((pedido) => pedido.dia === diaDeLaSemana(dia))
  );
}

function coincideDiaDelMes(porDiaDelMes: number[], dia: number): boolean {
  const [anio, mes] = fechaCivil(dia);
  const primero = diaCivil(anio, mes, 1);
  const ultimo = diaCivil(anio, mes + 1, 1) - 1;
  return porDiaDelMes.some((pedido) => diaDelMesPedido(primero, ultimo, pedido) === dia);
}

function ordenarSinRepetir(dias: number[]): number[] {
  return [...new Set(dias)].sort((a, b) => a - b);
}
