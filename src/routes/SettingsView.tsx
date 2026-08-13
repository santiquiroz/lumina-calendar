import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  type ImportMode,
} from '@/data/backup';
import {
  applyTheme,
  CLAVE_TEMA,
  settingsRepo,
  type ThemePreference,
} from '@/data/settingsRepo';
import { currentPersistence, requestPersistentStorage } from '@/data/storagePersistence';
import type { PersistenceState } from '@/data/storagePersistence';
import { AttributionNotice } from '@/ui/AttributionNotice';
import { UpdateSection } from '@/ui/UpdateSection';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconDownload, IconMoon, IconSun, IconUpload } from '@/ui/icons';

const TEMAS: { valor: ThemePreference; etiqueta: string }[] = [
  { valor: 'light', etiqueta: 'Claro' },
  { valor: 'dark', etiqueta: 'Oscuro' },
  { valor: 'system', etiqueta: 'Como el sistema' },
];

export function SettingsView() {
  const [tema, setTema] = useState<ThemePreference>('system');
  const [persistencia, setPersistencia] = useState<PersistenceState>('no-soportado');
  const [modo, setModo] = useState<ImportMode>('merge');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void settingsRepo.get<ThemePreference>(CLAVE_TEMA, 'system').then(setTema);
    void currentPersistence().then(setPersistencia);
  }, []);

  async function cambiarTema(valor: ThemePreference): Promise<void> {
    setTema(valor);
    applyTheme(valor);
    await settingsRepo.set(CLAVE_TEMA, valor);
  }

  async function exportar(): Promise<void> {
    const respaldo = await exportBackup();
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = backupFileName();
    enlace.click();
    URL.revokeObjectURL(url);
    setMensaje(`Respaldo con ${respaldo.nodes.length} elementos descargado.`);
  }

  async function importar(entrada: File): Promise<void> {
    setError('');
    setMensaje('');
    try {
      const contenido = JSON.parse(await entrada.text()) as unknown;
      const respaldo = parseBackup(contenido);
      const resultado = await importBackup(respaldo, modo);
      setMensaje(`Se restauraron ${resultado.nodos} elementos.`);
    } catch (fallo) {
      setError(
        fallo instanceof BackupError
          ? fallo.message
          : 'No pudimos leer ese archivo. Revisá que sea un respaldo de Lumina.',
      );
    }
  }

  return (
    <section aria-labelledby="titulo-ajustes" className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-4">
      <h1
        id="titulo-ajustes"
        className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
      >
        Ajustes
      </h1>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[length:var(--text-body-lg)] font-semibold text-on-surface">
          {tema === 'dark' ? <IconMoon size={20} /> : <IconSun size={20} />}
          Apariencia
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEMAS.map(({ valor, etiqueta }) => (
            <Button
              key={valor}
              variant={tema === valor ? 'primario' : 'suave'}
              aria-pressed={tema === valor}
              onClick={() => void cambiarTema(valor)}
            >
              {etiqueta}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-[length:var(--text-body-lg)] font-semibold text-on-surface">
          Tus datos
        </h2>
        <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
          Todo vive en este dispositivo. Exportá de vez en cuando: es la única copia que existe.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportar()}>
            <IconDownload size={20} />
            Exportar respaldo
          </Button>
          <Button variant="suave" onClick={() => archivo.current?.click()}>
            <IconUpload size={20} />
            Importar respaldo
          </Button>
        </div>

        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">Modo de importación</legend>
          {(['merge', 'replace'] as ImportMode[]).map((valor) => (
            <label
              key={valor}
              className="flex items-center gap-2 text-[length:var(--text-body-sm)] text-on-surface-variant"
            >
              <input
                type="radio"
                name="modo-importacion"
                value={valor}
                checked={modo === valor}
                onChange={() => setModo(valor)}
              />
              {valor === 'merge' ? 'Fusionar con lo que ya tengo' : 'Reemplazar todo'}
            </label>
          ))}
        </fieldset>

        <input
          ref={archivo}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label="Archivo de respaldo"
          onChange={(evento) => {
            const entrada = evento.target.files?.[0];
            if (entrada) void importar(entrada);
            evento.target.value = '';
          }}
        />

        <div className="flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
          <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
            {persistencia === 'persistente'
              ? 'Este navegador ya guarda tus datos de forma permanente.'
              : 'El navegador podría borrar los datos si necesita espacio.'}
          </p>
          {persistencia !== 'persistente' ? (
            <Button
              variant="suave"
              onClick={() => void requestPersistentStorage().then(setPersistencia)}
            >
              Guardar mis datos en este dispositivo
            </Button>
          ) : null}
        </div>

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

      <UpdateSection />

      <AttributionNotice />

      <Link to="/acerca-de" className="text-primary underline">
        Acerca de Lumina
      </Link>
    </section>
  );
}
