import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export function Card({ children, elevated = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-[length:var(--radius-lg)] bg-surface-lowest p-4 ${
        elevated ? 'shadow-[0_8px_24px_-12px_rgba(70,72,212,0.28)]' : 'border border-outline-variant/40'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
