import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { LuminaNode } from '@/domain/types';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';
import { IconChevronDown, IconChevronRight } from './icons';

const SANGRIA_MAXIMA = 6;
const SANGRIA_PX = 16;

export interface OutlinerRowProps {
  node: LuminaNode;
  nivel: number;
  tieneHijos: boolean;
  enfocado: boolean;
  onToggleDone(): void;
  onToggleCollapsed(): void;
  onChangeText(texto: string): void;
  onKeyDown(evento: KeyboardEvent<HTMLDivElement>): void;
  onFocus(): void;
}

export function OutlinerRow({
  node,
  nivel,
  tieneHijos,
  enfocado,
  onToggleDone,
  onToggleCollapsed,
  onChangeText,
  onKeyDown,
  onFocus,
}: OutlinerRowProps) {
  const campo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (campo.current && campo.current.textContent !== node.text) {
      campo.current.textContent = node.text;
    }
  }, [node.text]);

  useEffect(() => {
    if (enfocado && campo.current && document.activeElement !== campo.current) {
      campo.current.focus();
    }
  }, [enfocado]);

  return (
    <div
      role="treeitem"
      aria-level={nivel + 1}
      aria-expanded={tieneHijos ? !node.collapsed : undefined}
      aria-selected={enfocado}
      className="flex items-start gap-1 border-l border-outline-variant/20 py-0.5"
      style={{ paddingLeft: Math.min(nivel, SANGRIA_MAXIMA) * SANGRIA_PX }}
      data-nivel={nivel}
    >
      {tieneHijos ? (
        <IconButton
          label={node.collapsed ? 'Expandir subtareas' : 'Colapsar subtareas'}
          onClick={onToggleCollapsed}
          className="size-8"
        >
          {node.collapsed ? <IconChevronRight size={18} /> : <IconChevronDown size={18} />}
        </IconButton>
      ) : (
        <span className="inline-block size-8" aria-hidden="true" />
      )}

      <Checkbox
        label={`Completar ${node.text}`}
        checked={node.done}
        onChange={onToggleDone}
        className="mt-1.5"
      />

      <div
        ref={campo}
        role="textbox"
        aria-label={`Texto de la tarea ${node.text}`}
        contentEditable
        suppressContentEditableWarning
        tabIndex={0}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onBlur={(evento) => onChangeText(evento.currentTarget.textContent ?? '')}
        data-done={node.done}
        className={`min-h-11 flex-1 py-2 text-[length:var(--text-body-md)] break-words outline-none ${
          node.done ? 'text-on-surface-variant line-through opacity-60' : 'text-on-surface'
        }`}
      />
    </div>
  );
}
