import { useEffect, useRef, useState } from 'react';
import {
  agregarSuscripcion,
  importarIcs,
  listarSuscripciones,
  olvidarSuscripciones,
  quitarSuscripcion,
  sincronizarSuscripciones,
  type Suscripcion,
} from '@/data/calendarsRepo';
import {
  calendariosDisponibles,
  calendariosElegidos,
  elegirCalendarios,
  listarCalendariosDelDispositivo,
  olvidarCalendariosDelDispositivo,
  pedirPermisoCalendario,
  sincronizarCalendariosDelDispositivo,
  type DeviceCalendar,
} from '@/data/deviceCalendar';
import type { SyncResult } from '@/data/nodesRepo';
import { Button } from './Button';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { IconTrash, IconUpload } from './icons';

function resumen(resultado: SyncResult): string {
  const partes = [
    resultado.creados > 0 ? `${resultado.creados} nuevos` : '',
    resultado.actualizados > 0 ? `${resultado.actualizados} actualizados` : '',
    resultado.eliminados > 0 ? `${resultado.eliminados} quitados` : '',
  ].filter(Boolean);

  return partes.length === 0 ? 'Todo estaba al día.' : `Listo: ${partes.join(', ')}.`;
}

export function CalendarsSection() {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-[length:var(--text-body-lg)] font-semibold text-on-surface">
          Calendarios
        </h2>
        <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
          Traé lo que ya tenés agendado en otro lado. Lumina solo lee: nunca escribe en tus
          calendarios y nada de esto sale de tu dispositivo.
        </p>
      </div>

      <CalendariosDelTelefono onMensaje={setMensaje} onError={setError} />
      <Suscripciones onMensaje={setMensaje} onError={setError} />
      <ArchivoIcs onMensaje={setMensaje} onError={setError} />

      {mensaje ? (
        <p role="status" className="text-[length:var(--text-body-sm)] text-primary">
          {mensaje}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-accent">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

interface AvisosProps {
  onMensaje(texto: string): void;
  onError(texto: string): void;
}

function CalendariosDelTelefono({ onMensaje, onError }: AvisosProps) {
  const [calendarios, setCalendarios] = useState<DeviceCalendar[]>([]);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [permiso, setPermiso] = useState(false);

  useEffect(() => {
    void calendariosElegidos().then(setElegidos);
    void listarCalendariosDelDispositivo().then((lista) => {
      setCalendarios(lista);
      setPermiso(lista.length > 0);
    });
  }, []);

  if (!calendariosDisponibles()) {
    return (
      <section className="flex flex-col gap-1 border-t border-outline-variant/40 pt-3">
        <h3 className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
          Calendarios del teléfono
        </h3>
        <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
          Disponible en la app de Android. En el navegador usá una suscripción o un archivo .ics.
        </p>
      </section>
    );
  }

  async function conectar(): Promise<void> {
    const concedido = await pedirPermisoCalendario();
    setPermiso(concedido);
    if (!concedido) {
      onError('Sin permiso de calendario no podemos leer tus eventos.');
      return;
    }
    setCalendarios(await listarCalendariosDelDispositivo());
  }

  async function alternar(id: string, marcado: boolean): Promise<void> {
    const siguiente = marcado ? [...elegidos, id] : elegidos.filter((otro) => otro !== id);
    setElegidos(siguiente);
    await elegirCalendarios(siguiente);
  }

  async function sincronizar(): Promise<void> {
    onError('');
    onMensaje(resumen(await sincronizarCalendariosDelDispositivo()));
  }

  return (
    <section className="flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
      <h3 className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
        Calendarios del teléfono
      </h3>

      {!permiso ? (
        <>
          <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
            Lee los calendarios que tu teléfono ya sincroniza: Google, Outlook, Samsung, el que
            tengas.
          </p>
          <Button variant="suave" onClick={() => void conectar()}>
            Conectar calendarios
          </Button>
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {calendarios.map((calendario) => (
              <li key={calendario.id}>
                <label className="flex items-center gap-3 text-[length:var(--text-body-sm)] text-on-surface">
                  <input
                    type="checkbox"
                    checked={elegidos.includes(calendario.id)}
                    onChange={(evento) => void alternar(calendario.id, evento.target.checked)}
                    className="size-5"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {calendario.name}
                    <span className="text-on-surface-variant"> · {calendario.account}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button variant="suave" onClick={() => void sincronizar()}>
              Sincronizar ahora
            </Button>
            <Button
              variant="fantasma"
              onClick={() =>
                void olvidarCalendariosDelDispositivo().then((cuantos) => {
                  setElegidos([]);
                  onMensaje(`Quitamos ${cuantos} eventos importados del teléfono.`);
                })
              }
            >
              Dejar de importar
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function Suscripciones({ onMensaje, onError }: AvisosProps) {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [nombre, setNombre] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    void listarSuscripciones().then(setSuscripciones);
  }, []);

  async function agregar(): Promise<void> {
    onError('');
    if (!url.trim()) {
      onError('Pegá la dirección del calendario en formato iCal.');
      return;
    }

    await agregarSuscripcion(nombre, url);
    setNombre('');
    setUrl('');
    setSuscripciones(await listarSuscripciones());
    onMensaje(resumen(await sincronizarSuscripciones()));
  }

  return (
    <section className="flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
      <h3 className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
        Suscripción por dirección
      </h3>
      <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
        Google Calendar, Outlook e iCloud publican una dirección privada en formato iCal. Pegala acá
        y Lumina la relee cada tanto.
      </p>

      <ul className="flex flex-col gap-1">
        {suscripciones.map((suscripcion) => (
          <li key={suscripcion.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[length:var(--text-body-sm)] text-on-surface">
              {suscripcion.nombre}
            </span>
            <IconButton
              label={`Quitar ${suscripcion.nombre}`}
              onClick={() =>
                void quitarSuscripcion(suscripcion.id).then(async () =>
                  setSuscripciones(await listarSuscripciones()),
                )
              }
            >
              <IconTrash size={20} />
            </IconButton>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <input
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          aria-label="Nombre del calendario"
          placeholder="Trabajo"
          className="min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface"
        />
        <input
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
          aria-label="Dirección iCal"
          placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
          className="min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="suave" onClick={() => void agregar()}>
            Agregar y sincronizar
          </Button>
          {suscripciones.length > 0 ? (
            <>
              <Button
                variant="suave"
                onClick={() =>
                  void sincronizarSuscripciones().then((resultado) => onMensaje(resumen(resultado)))
                }
              >
                Sincronizar ahora
              </Button>
              <Button
                variant="fantasma"
                onClick={() =>
                  void olvidarSuscripciones().then(async (cuantos) => {
                    setSuscripciones(await listarSuscripciones());
                    onMensaje(`Quitamos ${cuantos} eventos importados.`);
                  })
                }
              >
                Quitar todo
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ArchivoIcs({ onMensaje, onError }: AvisosProps) {
  const archivo = useRef<HTMLInputElement>(null);

  async function importar(entrada: File): Promise<void> {
    onError('');
    try {
      const resultado = await importarIcs(await entrada.text(), entrada.name);
      onMensaje(resumen(resultado));
    } catch {
      onError('No pudimos leer ese archivo. ¿Es un .ics exportado de tu calendario?');
    }
  }

  return (
    <section className="flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
      <h3 className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
        Archivo .ics
      </h3>
      <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
        Si exportaste tu calendario a un archivo, traelo de una vez.
      </p>

      <Button variant="suave" onClick={() => archivo.current?.click()}>
        <IconUpload size={20} />
        Importar archivo
      </Button>

      <input
        ref={archivo}
        type="file"
        accept=".ics,text/calendar"
        className="sr-only"
        aria-label="Archivo de calendario"
        onChange={(evento) => {
          const entrada = evento.target.files?.[0];
          if (entrada) void importar(entrada);
          evento.target.value = '';
        }}
      />
    </section>
  );
}
