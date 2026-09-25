import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

const UMBRAL_PUNTERO_PX = 4;
const ESPERA_TACTIL_MS = 350;
const TOLERANCIA_TACTIL_PX = 8;

interface Gesto {
  pointerId: number;
  inicioY: number;
  tactil: boolean;
  activo: boolean;
  espera: ReturnType<typeof setTimeout> | null;
}

export interface ManejadoresDeArrastre {
  onPointerDown(evento: ReactPointerEvent<HTMLElement>): void;
  onPointerMove(evento: ReactPointerEvent<HTMLElement>): void;
  onPointerUp(evento: ReactPointerEvent<HTMLElement>): void;
  onPointerCancel(): void;
  onClickCapture(evento: ReactMouseEvent<HTMLElement>): void;
  onContextMenu(evento: ReactMouseEvent<HTMLElement>): void;
}

export interface ArrastreVertical<T extends HTMLElement> {
  ref: RefObject<T | null>;
  desplazamientoPx: number | null;
  manejadores: ManejadoresDeArrastre;
}

function esBotonPrincipal(evento: ReactPointerEvent<HTMLElement>): boolean {
  return evento.pointerType !== 'mouse' || evento.button === 0;
}

function superaUmbral(gesto: Gesto, dy: number): boolean {
  return Math.abs(dy) >= (gesto.tactil ? TOLERANCIA_TACTIL_PX : UMBRAL_PUNTERO_PX);
}

function esDelGesto(gesto: Gesto | null, evento: ReactPointerEvent<HTMLElement>): gesto is Gesto {
  return gesto !== null && gesto.pointerId === evento.pointerId;
}

// Con el dedo, moverse enseguida es desplazar la página: el arrastre pide mantener presionado.
export function useArrastreVertical<T extends HTMLElement>(
  onSoltar: ((deltaPx: number) => void) | undefined,
): ArrastreVertical<T> {
  const ref = useRef<T | null>(null);
  const gesto = useRef<Gesto | null>(null);
  const acabaDeArrastrar = useRef(false);
  const [desplazamientoPx, setDesplazamientoPx] = useState<number | null>(null);

  const terminar = useCallback(() => {
    if (gesto.current?.espera) clearTimeout(gesto.current.espera);
    gesto.current = null;
    setDesplazamientoPx(null);
  }, []);

  const activar = useCallback(() => {
    if (!gesto.current) return;
    gesto.current.activo = true;
    setDesplazamientoPx(0);
  }, []);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const frenarDesplazamiento = (evento: TouchEvent) => {
      if (gesto.current?.activo) evento.preventDefault();
    };
    elemento.addEventListener('touchmove', frenarDesplazamiento, { passive: false });
    return () => elemento.removeEventListener('touchmove', frenarDesplazamiento);
  }, []);

  useEffect(() => terminar, [terminar]);

  const onPointerDown = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      if (gesto.current) return;
      acabaDeArrastrar.current = false;
      if (!onSoltar || !esBotonPrincipal(evento)) return;
      const tactil = evento.pointerType === 'touch';
      gesto.current = {
        pointerId: evento.pointerId,
        inicioY: evento.clientY,
        tactil,
        activo: false,
        espera: tactil ? setTimeout(activar, ESPERA_TACTIL_MS) : null,
      };
      if (!tactil) evento.currentTarget.setPointerCapture?.(evento.pointerId);
    },
    [onSoltar, activar],
  );

  const onPointerMove = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      const actual = gesto.current;
      if (!esDelGesto(actual, evento)) return;
      const dy = evento.clientY - actual.inicioY;
      if (actual.activo) {
        setDesplazamientoPx(dy);
        return;
      }
      if (!superaUmbral(actual, dy)) return;
      if (actual.tactil) {
        terminar();
        return;
      }
      actual.activo = true;
      setDesplazamientoPx(dy);
    },
    [terminar],
  );

  const onPointerUp = useCallback(
    (evento: ReactPointerEvent<HTMLElement>) => {
      const actual = gesto.current;
      if (!esDelGesto(actual, evento)) return;
      terminar();
      if (!actual.activo) return;
      acabaDeArrastrar.current = true;
      onSoltar?.(evento.clientY - actual.inicioY);
    },
    [onSoltar, terminar],
  );

  const onClickCapture = useCallback((evento: ReactMouseEvent<HTMLElement>) => {
    if (!acabaDeArrastrar.current) return;
    acabaDeArrastrar.current = false;
    evento.preventDefault();
    evento.stopPropagation();
  }, []);

  const onContextMenu = useCallback((evento: ReactMouseEvent<HTMLElement>) => {
    if (gesto.current) evento.preventDefault();
  }, []);

  return {
    ref,
    desplazamientoPx,
    manejadores: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: terminar,
      onClickCapture,
      onContextMenu,
    },
  };
}
