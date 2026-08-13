import { useEffect, useState } from 'react';
import {
  avisosActivados,
  avisosPendientes,
  pedirPermisoAvisos,
  setAvisosActivados,
  sincronizarAvisos,
  type EstadoAvisos,
} from '@/data/notificationsRepo';
import { useAllNodes } from '@/hooks/useNodes';
import { Button } from './Button';
import { Card } from './Card';

const EXPLICACION: Record<EstadoAvisos, string> = {
  activos: 'Los avisos están programados en el sistema y suenan con la app cerrada.',
  'sin-permiso': 'Android todavía no nos dio permiso para avisarte.',
  apagados: 'Los avisos están apagados.',
  'no-soportado': 'En el navegador no podemos avisarte con la app cerrada. En el APK sí.',
};

export function RemindersSection() {
  const nodos = useAllNodes();
  const [activados, setActivados] = useState(true);
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    void avisosActivados().then(setActivados);
    void avisosPendientes().then(setPendientes);
  }, []);

  async function refrescar(): Promise<void> {
    setEstado(await sincronizarAvisos(nodos));
    setPendientes(await avisosPendientes());
  }

  async function alternar(valor: boolean): Promise<void> {
    setActivados(valor);
    await setAvisosActivados(valor);
    if (valor) await pedirPermisoAvisos();
    await refrescar();
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[length:var(--text-body-lg)] font-semibold text-on-surface">Avisos</h2>

      <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
        Un aviso cuando empieza un bloque y otro cuando entra en ámbar, con el mismo margen
        proporcional que ves en pantalla. Nada de recordatorios repetidos ni insistentes.
      </p>

      <label className="flex items-center gap-3 text-[length:var(--text-body-md)] text-on-surface">
        <input
          type="checkbox"
          checked={activados}
          onChange={(evento) => void alternar(evento.target.checked)}
          className="size-5"
        />
        Avisarme de mis bloques
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="suave" onClick={() => void refrescar()}>
          Reprogramar avisos
        </Button>
        {estado ? (
          <p role="status" className="text-[length:var(--text-body-sm)] text-on-surface-variant">
            {EXPLICACION[estado]}
          </p>
        ) : null}
      </div>

      {pendientes > 0 ? (
        <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
          {pendientes} {pendientes === 1 ? 'aviso programado' : 'avisos programados'}
        </p>
      ) : null}
    </Card>
  );
}
