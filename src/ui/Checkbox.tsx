import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <span className="inline-flex size-11 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        className={`size-5 cursor-pointer appearance-none rounded-[length:var(--radius-sm)] border-[1.5px] border-outline-variant bg-transparent transition-colors duration-200 checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
        {...props}
      />
    </span>
  );
}
