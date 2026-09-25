import { diaCivil, diasDeLaRegla, fechaCivil, parseRrule, type ReglaRecurrencia } from './rrule';

export interface IcsEvent {
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  recurrenceId: string | null;
}

export interface VentanaIcs {
  desde: string;
  hasta: string;
}

interface ContentLine {
  name: string;
  params: Map<string, string>;
  value: string;
}

interface IcsMoment {
  ms: number;
  dateOnly: boolean;
  partes: number[];
  esUtc: boolean;
  zona: string | undefined;
}

interface VeventBlock {
  propiedades: ContentLine[];
  fin: number;
}

interface VeventBase {
  uid: string;
  summary: string;
  inicio: IcsMoment;
  finMs: number;
}

interface Serie {
  base: VeventBase;
  regla: ReglaRecurrencia;
  omitidas: Set<string>;
  pasaDelFinal: (instancia: IcsMoment) => boolean;
}

interface Limites {
  desdeMs: number;
  hastaMs: number;
}

const MS_SEGUNDO = 1_000;
const MS_MINUTO = 60 * MS_SEGUNDO;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;
const TOPE_INSTANCIAS_POR_SERIE = 1_000;
const MARGEN_DIAS_VENTANA = 3;
const SIN_LIMITES: Limites = { desdeMs: -Infinity, hastaMs: Infinity };

const PATRON_FECHA = /^(\d{4})(\d{2})(\d{2})$/;
const PATRON_FECHA_HORA = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;
const PATRON_DURACION = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const PATRON_ESCAPE = /\\([\\;,nN])/g;

export function parseIcs(texto: string, ventana?: VentanaIcs): IcsEvent[] {
  const bloques = extractVevents(readContentLines(texto));
  const reemplazadas = instanciasReemplazadas(bloques);
  const limites = ventana === undefined ? SIN_LIMITES : limitesDe(ventana);

  return bloques
    .flatMap((propiedades) => eventosDelBloque(propiedades, reemplazadas, limites))
    .filter((evento) => seSolapa(evento, limites));
}

function limitesDe(ventana: VentanaIcs): Limites {
  return { desdeMs: Date.parse(ventana.desde), hastaMs: Date.parse(ventana.hasta) };
}

function seSolapa(evento: IcsEvent, limites: Limites): boolean {
  return Date.parse(evento.start) < limites.hastaMs && Date.parse(evento.end) > limites.desdeMs;
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

// Una instancia con RECURRENCE-ID (movida o cancelada) ocupa el lugar de la
// que la regla habría generado; se junta antes de expandir porque puede venir
// en cualquier parte del archivo.
function instanciasReemplazadas(bloques: ContentLine[][]): Map<string, Set<string>> {
  const porUid = new Map<string, Set<string>>();
  for (const propiedades of bloques) {
    const original = momentoOriginal(propiedades);
    if (original === null) continue;
    const uid = leerUid(propiedades);
    porUid.set(uid, (porUid.get(uid) ?? new Set<string>()).add(claveDeInstancia(original)));
  }
  return porUid;
}

function momentoOriginal(propiedades: ContentLine[]): IcsMoment | null {
  const linea = firstLine(propiedades, 'RECURRENCE-ID');
  return linea === null ? null : parseMoment(linea);
}

function eventosDelBloque(
  propiedades: ContentLine[],
  reemplazadas: Map<string, Set<string>>,
  limites: Limites,
): IcsEvent[] {
  const base = readBase(propiedades);
  if (base === null || estaCancelado(propiedades)) return [];

  if (esReemplazo(propiedades)) return instanciaReemplazo(propiedades, base);

  const serie = readSerie(propiedades, base, reemplazadas.get(base.uid));
  if (serie === null) return [buildEvent(base, base.inicio, base.finMs, null)];
  return expandirSerie(serie, limites);
}

function esReemplazo(propiedades: ContentLine[]): boolean {
  return firstLine(propiedades, 'RECURRENCE-ID') !== null;
}

function readBase(propiedades: ContentLine[]): VeventBase | null {
  const uid = leerUid(propiedades);
  const inicioLinea = firstLine(propiedades, 'DTSTART');
  if (uid === '' || inicioLinea === null) return null;

  const inicio = parseMoment(inicioLinea);
  if (inicio === null) return null;

  return {
    uid,
    summary: unescapeText(firstValue(propiedades, 'SUMMARY').trim()),
    inicio,
    finMs: resolveEnd(propiedades, inicio),
  };
}

function leerUid(propiedades: ContentLine[]): string {
  return unescapeText(firstValue(propiedades, 'UID').trim());
}

function buildEvent(
  base: VeventBase,
  inicio: IcsMoment,
  finMs: number,
  recurrenceId: string | null,
): IcsEvent {
  return {
    uid: base.uid,
    summary: base.summary,
    start: new Date(inicio.ms).toISOString(),
    end: new Date(finMs).toISOString(),
    allDay: inicio.dateOnly,
    recurrenceId,
  };
}

function estaCancelado(propiedades: ContentLine[]): boolean {
  return firstValue(propiedades, 'STATUS').trim().toUpperCase() === 'CANCELLED';
}

function instanciaReemplazo(propiedades: ContentLine[], base: VeventBase): IcsEvent[] {
  const original = momentoOriginal(propiedades);
  if (original === null) return [];
  return [buildEvent(base, base.inicio, base.finMs, claveDeInstancia(original))];
}

// Los eventos de todo el día se identifican por su fecha civil y no por un
// instante: así la clave no cambia si el dispositivo cambia de zona horaria.
function claveDeInstancia(momento: IcsMoment): string {
  if (!momento.dateOnly) return new Date(momento.ms).toISOString();
  const [anio, mes, dia] = momento.partes;
  return `${String(anio).padStart(4, '0')}-${dosCifras(mes)}-${dosCifras(dia)}`;
}

function dosCifras(valor: number): string {
  return String(valor).padStart(2, '0');
}

function readSerie(
  propiedades: ContentLine[],
  base: VeventBase,
  reemplazadas: Set<string> = new Set(),
): Serie | null {
  const linea = firstLine(propiedades, 'RRULE');
  const regla = linea === null ? null : parseRrule(linea.value);
  if (regla === null) return null;

  const pasaDelFinal = finalDeLaRegla(regla, base.inicio);
  if (pasaDelFinal === null) return null;

  const omitidas = new Set([...fechasExcluidas(propiedades), ...reemplazadas]);
  return { base, regla, omitidas, pasaDelFinal };
}

// Un UNTIL sin zona se lee en la zona de DTSTART; uno de solo fecha incluye
// ese día completo.
function finalDeLaRegla(
  regla: ReglaRecurrencia,
  inicio: IcsMoment,
): ((instancia: IcsMoment) => boolean) | null {
  if (regla.hasta === null) return () => false;

  const hasta = parseMoment({
    name: 'UNTIL',
    params: parametrosDeZona(inicio),
    value: regla.hasta,
  });
  if (hasta === null) return null;
  if (!hasta.dateOnly) return (instancia) => instancia.ms > hasta.ms;

  const ultimoDia = diaDe(hasta);
  return (instancia) => diaDe(instancia) > ultimoDia;
}

function parametrosDeZona(momento: IcsMoment): Map<string, string> {
  return momento.zona === undefined ? new Map() : new Map([['TZID', momento.zona]]);
}

function fechasExcluidas(propiedades: ContentLine[]): string[] {
  return propiedades
    .filter((linea) => linea.name === 'EXDATE')
    .flatMap((linea) =>
      linea.value.split(',').map((valor) => parseMoment({ ...linea, value: valor })),
    )
    .filter((momento): momento is IcsMoment => momento !== null)
    .map(claveDeInstancia);
}

function expandirSerie(serie: Serie, limites: Limites): IcsEvent[] {
  const eventos: IcsEvent[] = [];

  for (const inicio of iniciosDeLaSerie(serie, limites)) {
    const clave = claveDeInstancia(inicio);
    if (serie.omitidas.has(clave)) continue;

    const evento = buildEvent(serie.base, inicio, finDeInstancia(serie.base, inicio), clave);
    if (!seSolapa(evento, limites)) continue;

    eventos.push(evento);
    if (eventos.length >= TOPE_INSTANCIAS_POR_SERIE) break;
  }

  return eventos;
}

// COUNT se cuenta desde DTSTART, también con las instancias que quedan antes
// de la ventana o que EXDATE quita después. Las anteriores a la ventana solo se
// cuentan: pasarlas a milisegundos con su zona cuesta caro y no se usan.
function* iniciosDeLaSerie(serie: Serie, limites: Limites): Generator<IcsMoment> {
  const conteo = serie.regla.conteo ?? Infinity;
  const primerDiaUtil = primerDiaQuePuedeSolaparse(serie.base, limites.desdeMs);
  let generadas = 0;

  for (const dia of diasDeLaSerie(serie.regla, serie.base.inicio, limiteDia(limites.hastaMs))) {
    if (generadas >= conteo) return;
    generadas += 1;
    if (dia < primerDiaUtil) continue;

    const inicio = trasladar(serie.base.inicio, dia);
    if (serie.pasaDelFinal(inicio) || inicio.ms >= limites.hastaMs) return;
    yield inicio;
  }
}

// Tres días de margen cubren la zona del evento (hasta ±14 h), la hora de
// inicio dentro del día y un cambio de horario en la duración.
function primerDiaQuePuedeSolaparse(base: VeventBase, desdeMs: number): number {
  if (!Number.isFinite(desdeMs)) return -Infinity;
  const diasDeDuracion = Math.ceil((base.finMs - base.inicio.ms) / MS_DIA);
  return Math.floor(desdeMs / MS_DIA) - diasDeDuracion - MARGEN_DIAS_VENTANA;
}

// DTSTART siempre es la primera instancia de la serie, aunque la regla no lo
// incluya.
function* diasDeLaSerie(
  regla: ReglaRecurrencia,
  inicio: IcsMoment,
  limite: number,
): Generator<number> {
  const inicioDia = diaDe(inicio);
  yield inicioDia;
  for (const dia of diasDeLaRegla(regla, inicioDia, limite)) {
    if (dia > inicioDia) yield dia;
  }
}

// Dos días de margen: la fecha civil de una instancia puede ir por delante de
// la fecha UTC del borde de la ventana según la zona del evento.
function limiteDia(hastaMs: number): number {
  return Number.isFinite(hastaMs) ? Math.floor(hastaMs / MS_DIA) + 2 : Infinity;
}

function diaDe(momento: IcsMoment): number {
  const [anio, mes, dia] = momento.partes;
  return diaCivil(anio, mes, dia);
}

// Se traslada la hora de reloj, no el instante: así una serie de las 9:00
// sigue a las 9:00 después de un cambio de horario.
function trasladar(momento: IcsMoment, dia: number): IcsMoment {
  const partes = [...fechaCivil(dia), ...momento.partes.slice(3)];
  const ms = momento.dateOnly ? localMs(partes) : absoluteMs(partes, momento.esUtc, momento.zona);
  return { ...momento, partes, ms };
}

function finDeInstancia(base: VeventBase, inicio: IcsMoment): number {
  if (!inicio.dateOnly) return inicio.ms + (base.finMs - base.inicio.ms);
  const dias = Math.round((base.finMs - base.inicio.ms) / MS_DIA);
  return trasladar(inicio, diaDe(inicio) + dias).ms;
}

function firstLine(propiedades: ContentLine[], nombre: string): ContentLine | null {
  return propiedades.find((linea) => linea.name === nombre) ?? null;
}

function firstValue(propiedades: ContentLine[], nombre: string): string {
  return firstLine(propiedades, nombre)?.value ?? '';
}

function resolveEnd(propiedades: ContentLine[], inicio: IcsMoment): number {
  const fin = declaredEnd(propiedades, inicio);
  if (fin === null) return defaultEnd(inicio);
  return fin > inicio.ms ? fin : minimumEnd(inicio);
}

function declaredEnd(propiedades: ContentLine[], inicio: IcsMoment): number | null {
  const finLinea = firstLine(propiedades, 'DTEND');
  const fin = finLinea === null ? null : parseMoment(finLinea);
  if (fin !== null) return fin.ms;

  const duracion = parseDuration(firstValue(propiedades, 'DURATION'));
  return duracion === null ? null : inicio.ms + duracion;
}

function defaultEnd(inicio: IcsMoment): number {
  return inicio.dateOnly ? nextLocalDayMs(inicio.ms) : inicio.ms + MS_HORA;
}

function minimumEnd(inicio: IcsMoment): number {
  return inicio.dateOnly ? nextLocalDayMs(inicio.ms) : inicio.ms + MS_MINUTO;
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
  return { ms: localMs(partes), dateOnly: true, partes, esUtc: false, zona: undefined };
}

function timedMoment(campos: RegExpExecArray, zona: string | undefined): IcsMoment | null {
  const partes = campos.slice(1, 7).map(Number);
  if (!esFechaValida(partes)) return null;
  const esUtc = campos[7] === 'Z';
  return { ms: absoluteMs(partes, esUtc, zona), dateOnly: false, partes, esUtc, zona };
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

// Construir un Intl.DateTimeFormat es caro y una serie lo pide dos veces por
// instancia; también se recuerda que una zona no existe.
const formateadoresPorZona = new Map<string, Intl.DateTimeFormat | null>();

function zoneFormatter(zona: string): Intl.DateTimeFormat | null {
  if (!formateadoresPorZona.has(zona)) formateadoresPorZona.set(zona, crearFormateador(zona));
  return formateadoresPorZona.get(zona) ?? null;
}

function crearFormateador(zona: string): Intl.DateTimeFormat | null {
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
