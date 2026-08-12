import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  className = '',
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-surface-low hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-surface-mid disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
