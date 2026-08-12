import { Link } from 'react-router';
import { AttributionNotice } from '@/ui/AttributionNotice';

export function AboutView() {
  return (
    <section aria-labelledby="titulo-acerca" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <h1
        id="titulo-acerca"
        className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
      >
        Acerca de Lumina
      </h1>

      <p className="text-[length:var(--text-body-md)] text-on-surface-variant">
        Lumina es un calendario donde cada evento es una carpeta de tareas anidables y las ideas sin
        fecha tienen su propio lugar. Todo vive en este dispositivo: no hay cuentas, no hay servidor,
        no hay nadie mirando.
      </p>

      <AttributionNotice />

      <Link to="/ajustes" className="text-primary underline">
        Volver a Ajustes
      </Link>
    </section>
  );
}
