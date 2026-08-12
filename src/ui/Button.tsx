import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'suave' | 'fantasma';
type Tamano = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamano;
  children: ReactNode;
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-on-primary hover:brightness-110 active:brightness-95 shadow-sm',
  suave: 'bg-surface-low text-on-surface hover:bg-surface-mid active:bg-surface-high',
  fantasma: 'bg-transparent text-on-surface-variant hover:bg-surface-low active:bg-surface-mid',
};

const TAMANOS: Record<Tamano, string> = {
  md: 'min-h-11 px-4 text-[length:var(--text-label-md)]',
  lg: 'min-h-14 px-6 text-[length:var(--text-body-lg)]',
};

export function Button({
  variant = 'primario',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[length:var(--radius-md)] font-semibold transition-[background-color,filter,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variant]} ${TAMANOS[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
