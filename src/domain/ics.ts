export interface IcsEvent {
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface ContentLine {
  name: string;
  params: Map<string, string>;
  value: string;
}

interface IcsMoment {
  ms: number;
  dateOnly: boolean;
}

interface VeventBlock {
  propiedades: ContentLine[];
  fin: number;
}

const MS_SEGUNDO = 1_000;
const MS_MINUTO = 60 * MS_SEGUNDO;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;

const PATRON_FECHA = /^(\d{4})(\d{2})(\d{2})$/;
const PATRON_FECHA_HORA = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;
const PATRON_DURACION = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const PATRON_ESCAPE = /\\([\\;,nN])/g;

export function parseIcs(texto: string): IcsEvent[] {
  return extractVevents(readContentLines(texto)).map(buildEvent).filter(esEvento);
}

function esEvento(evento: IcsEvent | null): evento is IcsEvent {
  return evento !== null;
}

function readContentLines(texto: string): ContentLine[] {
  const lineas: ContentLine[] = [];
  for (const cruda of unfold(texto)) {
    const linea = parseContentLine(cruda);
    if (linea !== null) lineas.push(linea);
  }
  return lineas;
}

function unfold(texto: string): string[] {
  const lineas: string[] = [];
  for (const cruda of texto.replace(/\r\n?/g, '\n').split('\n')) {
    if (esContinuacion(cruda) && lineas.length > 0) {
      lineas[lineas.length - 1] += cruda.slice(1);
      continue;
    }
    lineas.push(cruda);
  }
  return lineas;
}

function esContinuacion(cruda: string): boolean {
  return cruda.startsWith(' ') || cruda.startsWith('\t');
}

function parseContentLine(cruda: string): ContentLine | null {
  const partes = splitAtFirstColon(cruda);
  if (partes === null) return null;

  const trozos = splitOutsideQuotes(partes[0], ';');
  const nombre = trozos[0].trim().toUpperCase();
  if (nombre === '') return null;

  return { name: nombre, params: readParams(trozos.slice(1)), value: partes[1] };
}

// El primer ":" fuera de comillas separa el encabezado del valor: los parámetros
// entrecomillados pueden contener ":" y el valor puede contener más.
function splitAtFirstColon(cruda: string): [string, string] | null {
  let entreComillas = false;
  for (let i = 0; i < cruda.length; i += 1) {
    if (cruda[i] === '"') entreComillas = !entreComillas;
    if (cruda[i] === ':' && !entreComillas) return [cruda.slice(0, i), cruda.slice(i + 1)];
  }
  return null;
}

function splitOutsideQuotes(texto: string, separador: string): string[] {
  const trozos: string[] = [];
  let actual = '';
  let entreComillas = false;

  for (const caracter of texto) {
    if (caracter === '"') entreComillas = !entreComillas;
    if (caracter === separador && !entreComillas) {
      trozos.push(actual);
      actual = '';
      continue;
    }
    actual += caracter;
  }

  trozos.push(actual);
  return trozos;
}

function readParams(trozos: string[]): Map<string, string> {
  const params = new Map<string, string>();
  for (const trozo of trozos) {
    const corte = trozo.indexOf('=');
    if (corte <= 0) continue;
    params.set(trozo.slice(0, corte).trim().toUpperCase(), unquote(trozo.slice(corte + 1).trim()));
  }
  return params;
}

function unquote(valor: string): string {
  const entrecomillado = valor.length >= 2 && valor.startsWith('"') && valor.endsWith('"');
  return entrecomillado ? valor.slice(1, -1) : valor;
}

function extractVevents(lineas: ContentLine[]): ContentLine[][] {
  const bloques: ContentLine[][] = [];
  let indice = 0;

  while (indice < lineas.length) {
    if (!abreVevent(lineas[indice])) {
      indice += 1;
      continue;
    }
    const bloque = readVevent(lineas, indice + 1);
    bloques.push(bloque.propiedades);
    indice = bloque.fin + 1;
  }

  return bloques;
}

function abreVevent(linea: ContentLine): boolean {
  return linea.name === 'BEGIN' && linea.value.trim().toUpperCase() === 'VEVENT';
}

// Solo las propiedades de primer nivel: las de los componentes anidados (VALARM)
// no pertenecen al evento.
function readVevent(lineas: ContentLine[], desde: number): VeventBlock {
  const propiedades: ContentLine[] = [];
  let anidados = 0;

  for (let i = desde; i < lineas.length; i += 1) {
    const linea = lineas[i];
    if (linea.name === 'BEGIN') {
      anidados += 1;
      continue;
    }
    if (linea.name !== 'END') {
      if (anidados === 0) propiedades.push(linea);
      continue;
    }
    if (anidados === 0) return { propiedades, fin: i };
    anidados -= 1;
  }

  return { propiedades, fin: lineas.length };
}

function buildEvent(propiedades: ContentLine[]): IcsEvent | null {
  if (estaDescartado(propiedades)) return null;

  const uid = firstValue(propiedades, 'UID').trim();
  const inicioLinea = firstLine(propiedades, 'DTSTART');
  if (uid === '' || inicioLinea === null) return null;

  const inicio = parseMoment(inicioLinea);
  if (inicio === null) return null;

  return {
    uid: unescapeText(uid),
    summary: unescapeText(firstValue(propiedades, 'SUMMARY').trim()),
    start: new Date(inicio.ms).toISOString(),
    end: new Date(resolveEnd(propiedades, inicio)).toISOString(),
    allDay: inicio.dateOnly,
  };
}

function estaDescartado(propiedades: ContentLine[]): boolean {
  if (firstLine(propiedades, 'RECURRENCE-ID') !== null) return true;
  return firstValue(propiedades, 'STATUS').trim().toUpperCase() === 'CANCELLED';
}

function firstLine(propiedades: ContentLine[], nombre: string): ContentLine | null {
  return propiedades.find((linea) => linea.name === nombre) ?? null;
}

function firstValue(propiedades: ContentLine[], nombre: string): string {
  return firstLine(propiedades, nombre)?.value ?? '';
}

function resolveEnd(propiedades: ContentLine[], inicio: IcsMoment): number {
  const finLinea = firstLine(propiedades, 'DTEND');
  const fin = finLinea === null ? null : parseMoment(finLinea);
  if (fin !== null) return fin.ms;

  const duracion = parseDuration(firstValue(propiedades, 'DURATION'));
  if (duracion !== null) return inicio.ms + duracion;

  return defaultEnd(inicio);
}

function defaultEnd(inicio: IcsMoment): number {
  return inicio.dateOnly ? nextLocalDayMs(inicio.ms) : inicio.ms + MS_HORA;
}

// Sumar 24 h no siempre cae en el día siguiente: los cambios de horario de verano
// mueven la medianoche local.
function nextLocalDayMs(ms: number): number {
  const fecha = new Date(ms);
  fecha.setDate(fecha.getDate() + 1);
  return fecha.getTime();
}

function parseMoment(linea: ContentLine): IcsMoment | null {
  const valor = linea.value.trim();

  const soloFecha = PATRON_FECHA.exec(valor);
  if (soloFecha !== null) return dateOnlyMoment(soloFecha);

  const conHora = PATRON_FECHA_HORA.exec(valor);
  if (conHora === null) return null;

  return timedMoment(conHora, linea.params.get('TZID'));
}

function dateOnlyMoment(campos: RegExpExecArray): IcsMoment | null {
  const partes = [Number(campos[1]), Number(campos[2]), Number(campos[3]), 0, 0, 0];
  if (!esFechaValida(partes)) return null;
  return { ms: localMs(partes), dateOnly: true };
}

function timedMoment(campos: RegExpExecArray, zona: string | undefined): IcsMoment | null {
  const partes = campos.slice(1, 7).map(Number);
  if (!esFechaValida(partes)) return null;
  return { ms: absoluteMs(partes, campos[7] === 'Z', zona), dateOnly: false };
}

function absoluteMs(partes: number[], esUtc: boolean, zona: string | undefined): number {
  if (esUtc) return utcMs(partes);
  const enZona = zona === undefined ? null : zonedMs(partes, zona);
  return enZona ?? localMs(partes);
}

function esFechaValida(partes: number[]): boolean {
  const [anio, mes, dia, hora, minuto, segundo] = partes;
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  return hora <= 23 && minuto <= 59 && segundo <= 60;
}

// setUTCFullYear en vez de Date.UTC: este último mapea los años de dos cifras al
// siglo XX.
function utcMs(partes: number[]): number {
  const fecha = new Date(0);
  fecha.setUTCFullYear(partes[0], partes[1] - 1, partes[2]);
  fecha.setUTCHours(partes[3], partes[4], partes[5], 0);
  return fecha.getTime();
}

function localMs(partes: number[]): number {
  const fecha = new Date(0);
  fecha.setFullYear(partes[0], partes[1] - 1, partes[2]);
  fecha.setHours(partes[3], partes[4], partes[5], 0);
  return fecha.getTime();
}

// Sin base de datos de zonas horarias propia: Intl da el desfase real de la zona
// en ese instante, incluido el horario de verano. La segunda pasada corrige los
// saltos de desfase que caen entre la hora nominal y la real.
function zonedMs(partes: number[], zona: string): number | null {
  const nominal = utcMs(partes);
  const primero = zoneOffsetMs(nominal, zona);
  if (primero === null) return null;

  const segundo = zoneOffsetMs(nominal - primero, zona);
  return nominal - (segundo ?? primero);
}

function zoneOffsetMs(ms: number, zona: string): number | null {
  const formateador = zoneFormatter(zona);
  if (formateador === null) return null;
  return utcMs(readFormattedParts(formateador, ms)) - ms;
}

function zoneFormatter(zona: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return null;
  }
}

function readFormattedParts(formateador: Intl.DateTimeFormat, ms: number): number[] {
  const partes = new Map<string, string>();
  for (const parte of formateador.formatToParts(new Date(ms))) {
    partes.set(parte.type, parte.value);
  }
  return ['year', 'month', 'day', 'hour', 'minute', 'second'].map((clave) =>
    Number(partes.get(clave) ?? 0),
  );
}

function parseDuration(texto: string): number | null {
  const campos = PATRON_DURACION.exec(texto.trim().toUpperCase());
  if (campos === null) return null;

  const magnitudes: (string | undefined)[] = campos.slice(2, 7);
  if (magnitudes.every((magnitud) => magnitud === undefined)) return null;

  const total =
    aNumero(magnitudes[0]) * 7 * MS_DIA +
    aNumero(magnitudes[1]) * MS_DIA +
    aNumero(magnitudes[2]) * MS_HORA +
    aNumero(magnitudes[3]) * MS_MINUTO +
    aNumero(magnitudes[4]) * MS_SEGUNDO;

  return campos[1] === '-' ? -total : total;
}

function aNumero(valor: string | undefined): number {
  return valor === undefined ? 0 : Number(valor);
}

function unescapeText(valor: string): string {
  return valor.replace(PATRON_ESCAPE, (_coincidencia, caracter: string) =>
    caracter === 'n' || caracter === 'N' ? '\n' : caracter,
  );
}
