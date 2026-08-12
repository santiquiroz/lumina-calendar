# Lumina Calendar v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir Lumina Calendar v1: una PWA local-first donde cada evento del calendario es una carpeta de tareas anidables y las ideas sin fecha tienen un lugar propio antes de convertirse en compromisos.

**Architecture:** Modelo de nodo unificado (idea = evento = subtarea, distinguidos por `schedule` y `parentId`) sobre cuatro capas con dependencias unidireccionales: `domain` (TypeScript puro, sin React ni base de datos), `data` (Dexie/IndexedDB), `hooks` (consultas vivas), `ui`/`routes`. Todo lo derivable — progreso, estado de tiempo, rachas, badges — se calcula; nunca se almacena.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS v4, Dexie 4 + dexie-react-hooks, Zustand, React Router, zod, vite-plugin-pwa, Vitest + Testing Library + fake-indexeddb, Playwright.

## Global Constraints

- **Cero CDN en tiempo de ejecución.** Fuentes, iconos y librerías se sirven desde el bundle. La app debe funcionar completa sin red.
- **Profundidad máxima de anidación:** `MAX_DEPTH = 20` niveles bajo la raíz.
- **Umbral ámbar relativo:** `clamp(0.2 × duración, 60_000 ms, 900_000 ms)`. Nunca una constante absoluta.
- **Perdón de rachas:** un día perdido por ventana móvil de 7 días no rompe la racha. La interfaz nunca muestra el contador cayendo a cero.
- **Vocabulario prohibido en toda la copy visible:** "fallaste", "vencido", "atrasado", "perdiste", "urgente". Reprogramar no es un fracaso.
- **Sin etiquetas de prioridad ni badges de urgencia.** El color codifica categoría, nunca presión.
- **Idioma de la interfaz:** español. Nombres de código y commits en español según las convenciones del repositorio; identificadores de programación en inglés.
- **Tokens de diseño:** derivados de `design/stitch/lumina_calendar/DESIGN.md`. Primario `#4648d4`, superficie `#f8f9ff`, contenedor bajo `#eff4ff`, tipografía Hanken Grotesk, base de espaciado 8 px.
- **Dependencias entre capas:** `domain` no importa nada; `data` importa `domain`; `hooks` importa `data` y `domain`; `ui`/`routes` importan `hooks`, nunca `data`.
- **Cobertura:** `src/domain` ≥ 90 %, global ≥ 80 %.
- **Licencia:** AGPL-3.0-only con término adicional 7(b) de atribución. Todo archivo nuevo hereda esa licencia; no se añaden dependencias con licencia incompatible.

---

### Task 1: Scaffold del proyecto, tokens y tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/design/tokens.css`, `src/index.css`, `vitest.config.ts`, `src/test/setup.ts`, `src/domain/smoke.test.ts`, `eslint.config.js`, `.prettierrc`
- Test: `src/domain/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: scripts `npm run dev`, `npm run build`, `npm test`, `npm run test:coverage`, `npm run lint`. Alias de importación `@/` → `src/`. Clases de Tailwind con los tokens de Lumina disponibles globalmente.

- [ ] **Step 1: Crear el proyecto Vite**

```bash
cd c:/personal/lumina-calendar
npm create vite@latest . -- --template react-ts
npm install
```

Responder "sí" a sobrescribir si pregunta por archivos existentes; `docs/`, `design/`, `.gitignore` y `.git` deben conservarse (Vite no los toca).

- [ ] **Step 2: Instalar dependencias**

```bash
npm install dexie dexie-react-hooks zustand react-router zod uuid
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  fake-indexeddb @fontsource/hanken-grotesk vite-plugin-pwa
```

- [ ] **Step 3: Configurar Vite con Tailwind v4, alias y entorno de test**

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

Añadir a `tsconfig.json` en `compilerOptions`: `"baseUrl": ".", "paths": { "@/*": ["src/*"] }, "types": ["vitest/globals", "@testing-library/jest-dom"]`.

- [ ] **Step 4: Escribir los tokens de diseño**

`src/design/tokens.css`:

```css
@import 'tailwindcss';
@import '@fontsource/hanken-grotesk/400.css';
@import '@fontsource/hanken-grotesk/500.css';
@import '@fontsource/hanken-grotesk/600.css';
@import '@fontsource/hanken-grotesk/700.css';

@theme {
  --font-sans: 'Hanken Grotesk', system-ui, sans-serif;

  --color-surface: #f8f9ff;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #eff4ff;
  --color-surface-container: #e5eeff;
  --color-surface-container-high: #dce9ff;
  --color-surface-container-highest: #d3e4fe;
  --color-on-surface: #0b1c30;
  --color-on-surface-variant: #464554;
  --color-outline: #767586;
  --color-outline-variant: #c7c4d7;
  --color-primary: #4648d4;
  --color-on-primary: #ffffff;
  --color-primary-container: #6063ee;
  --color-inverse-primary: #c0c1ff;
  --color-amber: #b55d00;
  --color-amber-container: #ffdcc5;
  --color-on-amber-container: #301400;
  --color-secondary: #b90538;

  --spacing-base: 8px;
  --spacing-cell: 12px;
  --spacing-gutter: 16px;
  --spacing-margin: 24px;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --text-display: 48px;
  --text-headline-lg: 32px;
  --text-headline-md: 24px;
  --text-headline-sm: 20px;
  --text-body-lg: 18px;
  --text-body-md: 16px;
  --text-body-sm: 14px;
  --text-label-md: 14px;
  --text-label-sm: 12px;

  --hour-height: 64px;
}

@layer base {
  :root {
    color-scheme: light dark;
  }

  html.dark {
    --color-surface: #101a2b;
    --color-surface-container-lowest: #0b1220;
    --color-surface-container-low: #16213a;
    --color-surface-container: #1c2947;
    --color-surface-container-high: #223154;
    --color-surface-container-highest: #293b63;
    --color-on-surface: #eaf1ff;
    --color-on-surface-variant: #c3ccdf;
    --color-outline: #8b93a7;
    --color-outline-variant: #37415c;
    --color-primary: #c0c1ff;
    --color-on-primary: #07006c;
    --color-primary-container: #3436b5;
    --color-amber: #ffb783;
    --color-amber-container: #4a2500;
    --color-on-amber-container: #ffdcc5;
  }

  body {
    background-color: var(--color-surface);
    color: var(--color-on-surface);
    font-family: var(--font-sans);
    font-size: var(--text-body-md);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Reemplazar el contenido de `src/index.css` por `@import './design/tokens.css';`.

- [ ] **Step 5: Escribir la prueba de humo**

`src/domain/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('entorno de pruebas', () => {
  it('ejecuta TypeScript y tiene IndexedDB simulado disponible', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
```

- [ ] **Step 6: Ejecutar la prueba**

Run: `npm test -- --run`
Expected: PASS, 1 test.

- [ ] **Step 7: Verificar build y dev**

Run: `npm run build`
Expected: build exitoso sin errores de TypeScript.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript con Tailwind v4 y Vitest"
```

---

### Task 2: Índice fraccional de orden

**Files:**
- Create: `src/domain/order.ts`
- Test: `src/domain/order.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `orderBetween(before: string | null, after: string | null): string` — devuelve una cadena estrictamente entre las dos, permitiendo insertar entre hermanos sin reescribir a los demás. `ORDER_ALPHABET: string`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/domain/order.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { orderBetween } from './order';

describe('orderBetween', () => {
  it('genera una clave cuando no hay vecinos', () => {
    const key = orderBetween(null, null);
    expect(key.length).toBeGreaterThan(0);
  });

  it('genera una clave estrictamente entre dos vecinos', () => {
    const a = orderBetween(null, null);
    const c = orderBetween(a, null);
    const b = orderBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('genera una clave anterior a la primera', () => {
    const first = orderBetween(null, null);
    const before = orderBetween(null, first);
    expect(before < first).toBe(true);
  });

  it('mantiene el orden tras 200 inserciones consecutivas al inicio', () => {
    const keys: string[] = [orderBetween(null, null)];
    for (let i = 0; i < 200; i += 1) {
      keys.unshift(orderBetween(null, keys[0]));
    }
    const ordenadas = [...keys].sort();
    expect(keys).toEqual(ordenadas);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mantiene el orden tras 200 inserciones consecutivas en el medio', () => {
    let izquierda = orderBetween(null, null);
    const derecha = orderBetween(izquierda, null);
    const generadas: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      const nueva = orderBetween(izquierda, derecha);
      expect(izquierda < nueva).toBe(true);
      expect(nueva < derecha).toBe(true);
      generadas.push(nueva);
      izquierda = nueva;
    }
    expect(new Set(generadas).size).toBe(generadas.length);
  });

  it('rechaza límites invertidos', () => {
    const a = orderBetween(null, null);
    const b = orderBetween(a, null);
    expect(() => orderBetween(b, a)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/order.test.ts`
Expected: FAIL, no se encuentra el módulo `./order`.

- [ ] **Step 3: Implementar**

`src/domain/order.ts`:

```ts
export const ORDER_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const BASE = ORDER_ALPHABET.length;

function codeAt(value: string, index: number, fallback: number): number {
  if (index >= value.length) return fallback;
  const code = ORDER_ALPHABET.indexOf(value[index]);
  if (code < 0) throw new RangeError(`Carácter de orden inválido: ${value[index]}`);
  return code;
}

export function orderBetween(before: string | null, after: string | null): string {
  const lower = before ?? '';
  const upper = after ?? null;

  if (upper !== null && lower >= upper) {
    throw new RangeError(`Límites de orden invertidos: "${lower}" >= "${upper}"`);
  }

  let prefix = '';
  for (let i = 0; ; i += 1) {
    const low = codeAt(lower, i, -1);
    const high = upper === null ? BASE : codeAt(upper, i, BASE);

    if (high - low > 1) {
      return prefix + ORDER_ALPHABET[low + Math.floor((high - low) / 2)];
    }

    prefix += i < lower.length ? lower[i] : ORDER_ALPHABET[0];
  }
}
```

- [ ] **Step 4: Ejecutar hasta que pasen**

Run: `npm test -- --run src/domain/order.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/order.ts src/domain/order.test.ts
git commit -m "feat(dominio): índice fraccional de orden para reordenar sin reescribir hermanos"
```

---

### Task 3: Tipos del dominio y operaciones de árbol

**Files:**
- Create: `src/domain/types.ts`, `src/domain/errors.ts`, `src/domain/tree.ts`, `src/test/factories.ts`
- Test: `src/domain/tree.test.ts`

**Interfaces:**
- Consumes: `orderBetween` de Task 2.
- Produces:
  - `LuminaNode`, `Schedule`, `Recurrence`, `Activity`, `NodeId`, `EventColorKey` (types).
  - `DomainError` con `code: 'MAX_DEPTH' | 'CYCLE' | 'NOT_FOUND' | 'INVALID_SCHEDULE'`.
  - `MAX_DEPTH = 20`.
  - `indexNodes(nodes: LuminaNode[]): TreeIndex`.
  - `TreeIndex` con `byId: Map<NodeId, LuminaNode>`, `childrenOf(parentId: NodeId | null): LuminaNode[]`, `roots(): LuminaNode[]`.
  - `depthOf(index: TreeIndex, id: NodeId): number` (raíz = 0).
  - `descendantsOf(index: TreeIndex, id: NodeId): LuminaNode[]`.
  - `subtreeHeight(index: TreeIndex, id: NodeId): number`.
  - `isDescendant(index: TreeIndex, candidateId: NodeId, ancestorId: NodeId): boolean`.
  - `assertMoveAllowed(index: TreeIndex, nodeId: NodeId, newParentId: NodeId | null): void`.
  - `buildNode(overrides?: Partial<LuminaNode>): LuminaNode` en factories (solo para pruebas).

- [ ] **Step 1: Escribir los tipos y la fábrica de pruebas**

`src/domain/types.ts`:

```ts
export type NodeId = string;

export type EventColorKey = 'indigo' | 'teal' | 'rose' | 'amber' | 'slate';

export interface Schedule {
  start: string;
  end: string;
  allDay: boolean;
}

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  until: string | null;
}

export interface LuminaNode {
  id: NodeId;
  parentId: NodeId | null;
  text: string;
  done: boolean;
  order: string;
  collapsed: boolean;
  schedule: Schedule | null;
  tags: string[];
  colorKey: EventColorKey | null;
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export type ActivityType = 'capture' | 'complete' | 'schedule';

export interface Activity {
  id: string;
  type: ActivityType;
  nodeId: NodeId;
  at: string;
}
```

`src/domain/errors.ts`:

```ts
export type DomainErrorCode = 'MAX_DEPTH' | 'CYCLE' | 'NOT_FOUND' | 'INVALID_SCHEDULE';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
```

`src/test/factories.ts`:

```ts
import type { LuminaNode } from '@/domain/types';

let contador = 0;

export function buildNode(overrides: Partial<LuminaNode> = {}): LuminaNode {
  contador += 1;
  const ahora = '2026-08-12T10:00:00.000Z';
  return {
    id: `n${contador}`,
    parentId: null,
    text: `Nodo ${contador}`,
    done: false,
    order: 'U',
    collapsed: false,
    schedule: null,
    tags: [],
    colorKey: null,
    recurrence: null,
    createdAt: ahora,
    updatedAt: ahora,
    completedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export function buildChain(length: number): LuminaNode[] {
  const nodos: LuminaNode[] = [];
  for (let i = 0; i < length; i += 1) {
    nodos.push(
      buildNode({ id: `c${i}`, parentId: i === 0 ? null : `c${i - 1}`, text: `Nivel ${i}` }),
    );
  }
  return nodos;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/domain/tree.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildChain, buildNode } from '@/test/factories';
import { DomainError } from './errors';
import {
  MAX_DEPTH,
  assertMoveAllowed,
  depthOf,
  descendantsOf,
  indexNodes,
  isDescendant,
  subtreeHeight,
} from './tree';

describe('indexNodes', () => {
  it('agrupa los hijos por padre y ordena por la clave de orden', () => {
    const padre = buildNode({ id: 'p' });
    const b = buildNode({ id: 'b', parentId: 'p', order: 'k' });
    const a = buildNode({ id: 'a', parentId: 'p', order: 'U' });
    const index = indexNodes([padre, b, a]);
    expect(index.childrenOf('p').map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('excluye los nodos borrados', () => {
    const padre = buildNode({ id: 'p' });
    const hijo = buildNode({ id: 'h', parentId: 'p', deletedAt: '2026-08-12T10:00:00.000Z' });
    const index = indexNodes([padre, hijo]);
    expect(index.childrenOf('p')).toEqual([]);
    expect(index.byId.has('h')).toBe(false);
  });

  it('expone las raíces', () => {
    const raiz = buildNode({ id: 'r' });
    const hijo = buildNode({ id: 'h', parentId: 'r' });
    expect(indexNodes([raiz, hijo]).roots().map((n) => n.id)).toEqual(['r']);
  });
});

describe('depthOf', () => {
  it('asigna profundidad 0 a la raíz', () => {
    const index = indexNodes(buildChain(1));
    expect(depthOf(index, 'c0')).toBe(0);
  });

  it('cuenta un nivel por ancestro', () => {
    const index = indexNodes(buildChain(4));
    expect(depthOf(index, 'c3')).toBe(3);
  });

  it('lanza NOT_FOUND si el nodo no existe', () => {
    const index = indexNodes([]);
    expect(() => depthOf(index, 'inexistente')).toThrow(DomainError);
  });
});

describe('descendantsOf y subtreeHeight', () => {
  it('devuelve todos los descendientes en profundidad', () => {
    const index = indexNodes(buildChain(4));
    expect(descendantsOf(index, 'c0').map((n) => n.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('devuelve lista vacía para una hoja', () => {
    const index = indexNodes(buildChain(2));
    expect(descendantsOf(index, 'c1')).toEqual([]);
  });

  it('mide la altura del subárbol', () => {
    const index = indexNodes(buildChain(4));
    expect(subtreeHeight(index, 'c0')).toBe(3);
    expect(subtreeHeight(index, 'c3')).toBe(0);
  });
});

describe('isDescendant', () => {
  it('reconoce a un descendiente lejano', () => {
    const index = indexNodes(buildChain(4));
    expect(isDescendant(index, 'c3', 'c0')).toBe(true);
  });

  it('no considera descendiente a un ancestro', () => {
    const index = indexNodes(buildChain(4));
    expect(isDescendant(index, 'c0', 'c3')).toBe(false);
  });

  it('no considera descendiente a sí mismo', () => {
    const index = indexNodes(buildChain(2));
    expect(isDescendant(index, 'c1', 'c1')).toBe(false);
  });
});

describe('assertMoveAllowed', () => {
  it('permite mover a la raíz', () => {
    const index = indexNodes(buildChain(3));
    expect(() => assertMoveAllowed(index, 'c2', null)).not.toThrow();
  });

  it('rechaza mover un nodo dentro de su propio subárbol', () => {
    const index = indexNodes(buildChain(3));
    expect(() => assertMoveAllowed(index, 'c0', 'c2')).toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it('rechaza mover un nodo sobre sí mismo', () => {
    const index = indexNodes(buildChain(2));
    expect(() => assertMoveAllowed(index, 'c1', 'c1')).toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it(`permite un movimiento que deja el subárbol exactamente en ${MAX_DEPTH} niveles`, () => {
    const cadena = buildChain(MAX_DEPTH + 1);
    const suelto = buildNode({ id: 'suelto' });
    const index = indexNodes([...cadena, suelto]);
    expect(() => assertMoveAllowed(index, 'suelto', `c${MAX_DEPTH - 1}`)).not.toThrow();
  });

  it(`rechaza un movimiento que supera ${MAX_DEPTH} niveles`, () => {
    const cadena = buildChain(MAX_DEPTH + 1);
    const suelto = buildNode({ id: 'suelto' });
    const index = indexNodes([...cadena, suelto]);
    expect(() => assertMoveAllowed(index, 'suelto', `c${MAX_DEPTH}`)).toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });

  it('cuenta la altura del subárbol movido, no solo el nodo', () => {
    const cadena = buildChain(MAX_DEPTH - 1);
    const sueltoRaiz = buildNode({ id: 's0' });
    const sueltoHijo = buildNode({ id: 's1', parentId: 's0' });
    const sueltoNieto = buildNode({ id: 's2', parentId: 's1' });
    const index = indexNodes([...cadena, sueltoRaiz, sueltoHijo, sueltoNieto]);
    expect(() => assertMoveAllowed(index, 's0', `c${MAX_DEPTH - 2}`)).toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });
});
```

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/tree.test.ts`
Expected: FAIL, no se encuentra el módulo `./tree`.

- [ ] **Step 4: Implementar**

`src/domain/tree.ts`:

```ts
import { DomainError } from './errors';
import type { LuminaNode, NodeId } from './types';

export const MAX_DEPTH = 20;

export interface TreeIndex {
  byId: Map<NodeId, LuminaNode>;
  childrenOf(parentId: NodeId | null): LuminaNode[];
  roots(): LuminaNode[];
}

function porOrden(a: LuminaNode, b: LuminaNode): number {
  if (a.order === b.order) return a.id < b.id ? -1 : 1;
  return a.order < b.order ? -1 : 1;
}

export function indexNodes(nodes: LuminaNode[]): TreeIndex {
  const vivos = nodes.filter((n) => n.deletedAt === null);
  const byId = new Map(vivos.map((n) => [n.id, n]));
  const hijos = new Map<string, LuminaNode[]>();

  for (const nodo of vivos) {
    const clave = nodo.parentId ?? '\u0000root';
    const lista = hijos.get(clave) ?? [];
    lista.push(nodo);
    hijos.set(clave, lista);
  }

  for (const lista of hijos.values()) lista.sort(porOrden);

  return {
    byId,
    childrenOf: (parentId) => hijos.get(parentId ?? '\u0000root') ?? [],
    roots: () => hijos.get('\u0000root') ?? [],
  };
}

function nodoRequerido(index: TreeIndex, id: NodeId): LuminaNode {
  const nodo = index.byId.get(id);
  if (!nodo) throw new DomainError('NOT_FOUND', `No existe el nodo ${id}`);
  return nodo;
}

export function depthOf(index: TreeIndex, id: NodeId): number {
  let actual = nodoRequerido(index, id);
  let profundidad = 0;
  while (actual.parentId !== null) {
    actual = nodoRequerido(index, actual.parentId);
    profundidad += 1;
  }
  return profundidad;
}

export function descendantsOf(index: TreeIndex, id: NodeId): LuminaNode[] {
  nodoRequerido(index, id);
  const salida: LuminaNode[] = [];
  const pendientes = [...index.childrenOf(id)].reverse();
  while (pendientes.length > 0) {
    const nodo = pendientes.pop() as LuminaNode;
    salida.push(nodo);
    pendientes.push(...[...index.childrenOf(nodo.id)].reverse());
  }
  return salida;
}

export function subtreeHeight(index: TreeIndex, id: NodeId): number {
  const base = depthOf(index, id);
  return descendantsOf(index, id).reduce(
    (maxima, nodo) => Math.max(maxima, depthOf(index, nodo.id) - base),
    0,
  );
}

export function isDescendant(index: TreeIndex, candidateId: NodeId, ancestorId: NodeId): boolean {
  if (candidateId === ancestorId) return false;
  let actual = index.byId.get(candidateId);
  while (actual?.parentId != null) {
    if (actual.parentId === ancestorId) return true;
    actual = index.byId.get(actual.parentId);
  }
  return false;
}

export function assertMoveAllowed(
  index: TreeIndex,
  nodeId: NodeId,
  newParentId: NodeId | null,
): void {
  nodoRequerido(index, nodeId);

  if (newParentId === null) return;

  if (newParentId === nodeId || isDescendant(index, newParentId, nodeId)) {
    throw new DomainError('CYCLE', 'Un nodo no puede moverse dentro de sí mismo');
  }

  const profundidadDestino = depthOf(index, newParentId) + 1;
  const alturaMovida = subtreeHeight(index, nodeId);

  if (profundidadDestino + alturaMovida > MAX_DEPTH) {
    throw new DomainError(
      'MAX_DEPTH',
      `El movimiento superaría los ${MAX_DEPTH} niveles de anidación`,
    );
  }
}
```

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run src/domain/tree.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/test
git commit -m "feat(dominio): tipos del nodo unificado y operaciones de árbol con invariantes"
```

---

### Task 4: Progreso derivado y estado de tiempo con umbral ámbar relativo

**Files:**
- Create: `src/domain/progress.ts`, `src/domain/time.ts`
- Test: `src/domain/progress.test.ts`, `src/domain/time.test.ts`

**Interfaces:**
- Consumes: `TreeIndex`, `descendantsOf` de Task 3.
- Produces:
  - `Progress { done: number; total: number; ratio: number }` y `subtreeProgress(index: TreeIndex, rootId: NodeId): Progress`.
  - `TimeState = 'upcoming' | 'calm' | 'amber' | 'ended'`.
  - `amberThresholdMs(durationMs: number): number`.
  - `remainingMs(schedule: Schedule, now: Date): number`.
  - `remainingRatio(schedule: Schedule, now: Date): number`.
  - `timeState(schedule: Schedule, now: Date): TimeState`.
  - `AMBER_RATIO`, `AMBER_MIN_MS`, `AMBER_MAX_MS`.

- [ ] **Step 1: Escribir las pruebas de progreso**

`src/domain/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import { indexNodes } from './tree';
import { subtreeProgress } from './progress';

describe('subtreeProgress', () => {
  it('devuelve cero para un nodo sin descendientes', () => {
    const index = indexNodes([buildNode({ id: 'solo' })]);
    expect(subtreeProgress(index, 'solo')).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('cuenta todos los descendientes, no solo los hijos directos', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', done: true }),
      buildNode({ id: 'a1', parentId: 'a', done: true }),
      buildNode({ id: 'a2', parentId: 'a', done: false }),
      buildNode({ id: 'b', parentId: 'r', done: false }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('no cuenta la propia raíz aunque esté completada', () => {
    const nodos = [
      buildNode({ id: 'r', done: true }),
      buildNode({ id: 'h', parentId: 'r', done: false }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 0, total: 1, ratio: 0 });
  });

  it('ignora los descendientes borrados', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'vivo', parentId: 'r', done: true }),
      buildNode({ id: 'muerto', parentId: 'r', deletedAt: '2026-08-12T10:00:00.000Z' }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 1, total: 1, ratio: 1 });
  });
});
```

- [ ] **Step 2: Escribir las pruebas de tiempo**

`src/domain/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Schedule } from './types';
import { AMBER_MAX_MS, AMBER_MIN_MS, amberThresholdMs, remainingMs, timeState } from './time';

const MINUTO = 60_000;

function bloque(inicioIso: string, minutos: number): Schedule {
  const inicio = new Date(inicioIso);
  return {
    start: inicio.toISOString(),
    end: new Date(inicio.getTime() + minutos * MINUTO).toISOString(),
    allDay: false,
  };
}

describe('amberThresholdMs', () => {
  it('usa el 20 % de la duración en bloques medianos', () => {
    expect(amberThresholdMs(30 * MINUTO)).toBe(6 * MINUTO);
  });

  it('tapa el umbral en 15 minutos para bloques largos', () => {
    expect(amberThresholdMs(8 * 60 * MINUTO)).toBe(AMBER_MAX_MS);
  });

  it('no baja de un minuto en bloques muy cortos', () => {
    expect(amberThresholdMs(2 * MINUTO)).toBe(AMBER_MIN_MS);
  });
});

describe('timeState', () => {
  const inicio = '2026-08-12T14:00:00.000Z';

  it('marca upcoming antes del comienzo', () => {
    expect(timeState(bloque(inicio, 60), new Date('2026-08-12T13:59:00.000Z'))).toBe('upcoming');
  });

  it('marca calm en la primera mitad', () => {
    expect(timeState(bloque(inicio, 60), new Date('2026-08-12T14:10:00.000Z'))).toBe('calm');
  });

  it('marca amber dentro del umbral relativo de un bloque de 60 min', () => {
    expect(timeState(bloque(inicio, 60), new Date('2026-08-12T14:50:00.000Z'))).toBe('amber');
  });

  it('marca calm a 15 min del final de un bloque de 8 h', () => {
    const largo = bloque(inicio, 8 * 60);
    expect(timeState(largo, new Date('2026-08-12T21:44:00.000Z'))).toBe('calm');
    expect(timeState(largo, new Date('2026-08-12T21:46:00.000Z'))).toBe('amber');
  });

  it('no entra en amber demasiado pronto en un bloque de 15 min', () => {
    const corto = bloque(inicio, 15);
    expect(timeState(corto, new Date('2026-08-12T14:11:00.000Z'))).toBe('calm');
    expect(timeState(corto, new Date('2026-08-12T14:12:30.000Z'))).toBe('amber');
  });

  it('marca ended después del final', () => {
    expect(timeState(bloque(inicio, 60), new Date('2026-08-12T15:00:01.000Z'))).toBe('ended');
  });

  it('trata los eventos de día completo como calm mientras dure el día', () => {
    const diaCompleto: Schedule = {
      start: '2026-08-12T00:00:00.000Z',
      end: '2026-08-13T00:00:00.000Z',
      allDay: true,
    };
    expect(timeState(diaCompleto, new Date('2026-08-12T23:59:00.000Z'))).toBe('calm');
  });
});

describe('remainingMs', () => {
  it('nunca devuelve valores negativos', () => {
    expect(remainingMs(bloque('2026-08-12T14:00:00.000Z', 30), new Date('2026-08-12T18:00:00.000Z'))).toBe(0);
  });
});
```

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/progress.test.ts src/domain/time.test.ts`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 4: Implementar progreso**

`src/domain/progress.ts`:

```ts
import { descendantsOf, type TreeIndex } from './tree';
import type { NodeId } from './types';

export interface Progress {
  done: number;
  total: number;
  ratio: number;
}

export function subtreeProgress(index: TreeIndex, rootId: NodeId): Progress {
  const descendientes = descendantsOf(index, rootId);
  const total = descendientes.length;
  const done = descendientes.filter((n) => n.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
```

- [ ] **Step 5: Implementar tiempo**

`src/domain/time.ts`:

```ts
import type { Schedule } from './types';

export type TimeState = 'upcoming' | 'calm' | 'amber' | 'ended';

export const AMBER_RATIO = 0.2;
export const AMBER_MIN_MS = 60_000;
export const AMBER_MAX_MS = 15 * 60_000;

export function amberThresholdMs(durationMs: number): number {
  const relativo = durationMs * AMBER_RATIO;
  return Math.min(Math.max(relativo, AMBER_MIN_MS), AMBER_MAX_MS);
}

export function durationMs(schedule: Schedule): number {
  return Math.max(0, new Date(schedule.end).getTime() - new Date(schedule.start).getTime());
}

export function remainingMs(schedule: Schedule, now: Date): number {
  return Math.max(0, new Date(schedule.end).getTime() - now.getTime());
}

export function remainingRatio(schedule: Schedule, now: Date): number {
  const total = durationMs(schedule);
  if (total === 0) return 0;
  return remainingMs(schedule, now) / total;
}

export function timeState(schedule: Schedule, now: Date): TimeState {
  const ahora = now.getTime();
  const inicio = new Date(schedule.start).getTime();
  const fin = new Date(schedule.end).getTime();

  if (ahora < inicio) return 'upcoming';
  if (ahora >= fin) return 'ended';
  if (schedule.allDay) return 'calm';

  const restante = fin - ahora;
  return restante <= amberThresholdMs(fin - inicio) ? 'amber' : 'calm';
}
```

- [ ] **Step 6: Ejecutar hasta que pasen**

Run: `npm test -- --run src/domain/progress.test.ts src/domain/time.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "feat(dominio): progreso derivado y umbral ámbar proporcional a la duración del bloque"
```

---

### Task 5: Rachas con día de perdón y badges

**Files:**
- Create: `src/domain/calendarDay.ts`, `src/domain/streak.ts`, `src/domain/badges.ts`
- Test: `src/domain/streak.test.ts`, `src/domain/badges.test.ts`

**Interfaces:**
- Consumes: `Activity`, `LuminaNode` de Task 3; `subtreeProgress` de Task 4.
- Produces:
  - `toCalendarDay(iso: string): string` → `'YYYY-MM-DD'` en hora local.
  - `addDays(day: string, delta: number): string`.
  - `StreakResult { current: number; longest: number; forgivenessUsed: boolean }`.
  - `FORGIVENESS_WINDOW_DAYS = 7`.
  - `clarityDays(activities: Activity[]): Set<string>`.
  - `clarityStreak(activities: Activity[], today: Date): StreakResult`.
  - `BADGES: BadgeDefinition[]`, `BadgeDefinition { id: string; nombre: string; descripcion: string; icon: string; test(ctx: BadgeContext): boolean }`.
  - `earnedBadges(ctx: BadgeContext): string[]`, `BadgeContext { activities: Activity[]; nodes: LuminaNode[]; streak: StreakResult }`.

- [ ] **Step 1: Escribir las pruebas de rachas**

`src/domain/streak.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Activity } from './types';
import { addDays, toCalendarDay } from './calendarDay';
import { clarityStreak } from './streak';

const HOY = new Date('2026-08-12T12:00:00');

function actividadEn(dia: string): Activity {
  return { id: `a-${dia}`, type: 'complete', nodeId: 'n', at: `${dia}T09:00:00` };
}

function diasSeguidosHasta(dia: string, cantidad: number): Activity[] {
  return Array.from({ length: cantidad }, (_, i) => actividadEn(addDays(dia, -i)));
}

describe('clarityStreak', () => {
  const hoyDia = toCalendarDay(HOY.toISOString());

  it('devuelve cero sin actividad', () => {
    expect(clarityStreak([], HOY)).toEqual({ current: 0, longest: 0, forgivenessUsed: false });
  });

  it('cuenta días consecutivos terminando hoy', () => {
    const resultado = clarityStreak(diasSeguidosHasta(hoyDia, 3), HOY);
    expect(resultado.current).toBe(3);
    expect(resultado.forgivenessUsed).toBe(false);
  });

  it('no castiga que hoy todavía no tenga actividad', () => {
    const resultado = clarityStreak(diasSeguidosHasta(addDays(hoyDia, -1), 3), HOY);
    expect(resultado.current).toBe(3);
  });

  it('sobrevive a un solo día perdido y lo marca', () => {
    const actividades = [
      ...diasSeguidosHasta(hoyDia, 2),
      ...diasSeguidosHasta(addDays(hoyDia, -3), 2),
    ];
    const resultado = clarityStreak(actividades, HOY);
    expect(resultado.current).toBe(4);
    expect(resultado.forgivenessUsed).toBe(true);
  });

  it('se corta con dos días perdidos seguidos', () => {
    const actividades = [
      ...diasSeguidosHasta(hoyDia, 2),
      ...diasSeguidosHasta(addDays(hoyDia, -4), 3),
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(2);
  });

  it('solo perdona un día por ventana de siete', () => {
    const actividades = [
      actividadEn(hoyDia),
      actividadEn(addDays(hoyDia, -2)),
      actividadEn(addDays(hoyDia, -4)),
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(2);
  });

  it('recuerda la racha más larga aunque la actual sea menor', () => {
    const actividades = [
      actividadEn(hoyDia),
      ...diasSeguidosHasta(addDays(hoyDia, -10), 6),
    ];
    const resultado = clarityStreak(actividades, HOY);
    expect(resultado.current).toBe(1);
    expect(resultado.longest).toBeGreaterThanOrEqual(6);
  });

  it('cuenta una captura como día de claridad', () => {
    const captura: Activity = { id: 'c', type: 'capture', nodeId: 'n', at: `${hoyDia}T08:00:00` };
    expect(clarityStreak([captura], HOY).current).toBe(1);
  });
});
```

- [ ] **Step 2: Escribir las pruebas de badges**

`src/domain/badges.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import type { Activity } from './types';
import { earnedBadges } from './badges';

function capturas(cantidad: number): Activity[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `cap${i}`,
    type: 'capture' as const,
    nodeId: `n${i}`,
    at: '2026-08-12T09:00:00',
  }));
}

const sinRacha = { current: 0, longest: 0, forgivenessUsed: false };

describe('earnedBadges', () => {
  it('no otorga nada sin actividad', () => {
    expect(earnedBadges({ activities: [], nodes: [], streak: sinRacha })).toEqual([]);
  });

  it('otorga maestro-del-vaciado con cinco capturas', () => {
    const ganados = earnedBadges({ activities: capturas(5), nodes: [], streak: sinRacha });
    expect(ganados).toContain('maestro-del-vaciado');
  });

  it('no otorga maestro-del-vaciado con cuatro capturas', () => {
    const ganados = earnedBadges({ activities: capturas(4), nodes: [], streak: sinRacha });
    expect(ganados).not.toContain('maestro-del-vaciado');
  });

  it('otorga carpeta-completa cuando un evento tiene todas sus subtareas hechas', () => {
    const nodes = [
      buildNode({
        id: 'ev',
        schedule: { start: '2026-08-12T14:00:00', end: '2026-08-12T15:00:00', allDay: false },
      }),
      buildNode({ id: 's1', parentId: 'ev', done: true }),
      buildNode({ id: 's2', parentId: 'ev', done: true }),
    ];
    expect(earnedBadges({ activities: [], nodes, streak: sinRacha })).toContain('carpeta-completa');
  });

  it('no otorga carpeta-completa si queda una subtarea pendiente', () => {
    const nodes = [
      buildNode({
        id: 'ev',
        schedule: { start: '2026-08-12T14:00:00', end: '2026-08-12T15:00:00', allDay: false },
      }),
      buildNode({ id: 's1', parentId: 'ev', done: true }),
      buildNode({ id: 's2', parentId: 'ev', done: false }),
    ];
    expect(earnedBadges({ activities: [], nodes, streak: sinRacha })).not.toContain(
      'carpeta-completa',
    );
  });

  it('otorga siete-dias-claros con racha de siete', () => {
    const streak = { current: 7, longest: 7, forgivenessUsed: false };
    expect(earnedBadges({ activities: [], nodes: [], streak })).toContain('siete-dias-claros');
  });
});
```

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/streak.test.ts src/domain/badges.test.ts`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 4: Implementar días de calendario**

`src/domain/calendarDay.ts`:

```ts
const MS_POR_DIA = 86_400_000;

export function toCalendarDay(iso: string): string {
  const fecha = new Date(iso);
  const anio = fecha.getFullYear();
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function addDays(day: string, delta: number): string {
  const [anio, mes, dia] = day.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setDate(fecha.getDate() + delta);
  return toCalendarDay(fecha.toISOString());
}

export function daysBetween(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / MS_POR_DIA,
  );
}
```

- [ ] **Step 5: Implementar rachas**

`src/domain/streak.ts`:

```ts
import { addDays, daysBetween, toCalendarDay } from './calendarDay';
import type { Activity } from './types';

export const FORGIVENESS_WINDOW_DAYS = 7;
const LIMITE_RETROCESO_DIAS = 3650;

export interface StreakResult {
  current: number;
  longest: number;
  forgivenessUsed: boolean;
}

export function clarityDays(activities: Activity[]): Set<string> {
  return new Set(activities.map((a) => toCalendarDay(a.at)));
}

function contarDesde(dias: Set<string>, inicio: string): { largo: number; perdonUsado: boolean } {
  let cursor = inicio;
  let largo = 0;
  let perdonUsado = false;
  let diaPerdonado: string | null = null;

  for (let paso = 0; paso < LIMITE_RETROCESO_DIAS; paso += 1) {
    if (dias.has(cursor)) {
      largo += 1;
    } else {
      const perdonDisponible =
        diaPerdonado === null || daysBetween(cursor, diaPerdonado) >= FORGIVENESS_WINDOW_DAYS;
      if (!perdonDisponible) break;
      diaPerdonado = cursor;
      perdonUsado = true;
    }
    cursor = addDays(cursor, -1);
  }

  return { largo, perdonUsado };
}

export function clarityStreak(activities: Activity[], today: Date): StreakResult {
  const dias = clarityDays(activities);
  if (dias.size === 0) return { current: 0, longest: 0, forgivenessUsed: false };

  const hoy = toCalendarDay(today.toISOString());
  const arranque = dias.has(hoy) ? hoy : addDays(hoy, -1);
  const actual = contarDesde(dias, arranque);

  const longest = [...dias].reduce(
    (maximo, dia) => Math.max(maximo, contarDesde(dias, dia).largo),
    0,
  );

  return {
    current: actual.largo,
    longest: Math.max(longest, actual.largo),
    forgivenessUsed: actual.perdonUsado,
  };
}
```

Nota de implementación: `contarDesde` cuenta hacia atrás y solo perdona un día si el perdón anterior queda fuera de la ventana de 7 días, lo que hace que dos ausencias cercanas corten la racha. La racha más larga se calcula probando cada día de claridad como punto final.

- [ ] **Step 6: Implementar badges**

`src/domain/badges.ts`:

```ts
import { subtreeProgress } from './progress';
import type { StreakResult } from './streak';
import { indexNodes } from './tree';
import type { Activity, LuminaNode } from './types';

export interface BadgeContext {
  activities: Activity[];
  nodes: LuminaNode[];
  streak: StreakResult;
}

export interface BadgeDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  icon: string;
  test(ctx: BadgeContext): boolean;
}

function contarPorTipo(activities: Activity[], tipo: Activity['type']): number {
  return activities.filter((a) => a.type === tipo).length;
}

function tieneCarpetaCompleta(nodes: LuminaNode[]): boolean {
  const index = indexNodes(nodes);
  return index
    .roots()
    .filter((n) => n.schedule !== null)
    .some((evento) => {
      const progreso = subtreeProgress(index, evento.id);
      return progreso.total > 0 && progreso.done === progreso.total;
    });
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'primer-cierre',
    nombre: 'Primer cierre',
    descripcion: 'Completaste tu primera tarea.',
    icon: 'check',
    test: (ctx) => contarPorTipo(ctx.activities, 'complete') >= 1,
  },
  {
    id: 'maestro-del-vaciado',
    nombre: 'Maestro del vaciado',
    descripcion: 'Capturaste cinco ideas.',
    icon: 'sparkles',
    test: (ctx) => contarPorTipo(ctx.activities, 'capture') >= 5,
  },
  {
    id: 'carpeta-completa',
    nombre: 'Carpeta completa',
    descripcion: 'Cerraste todas las subtareas de un evento.',
    icon: 'folder-check',
    test: (ctx) => tieneCarpetaCompleta(ctx.nodes),
  },
  {
    id: 'siete-dias-claros',
    nombre: 'Siete días claros',
    descripcion: 'Una semana de claridad seguida.',
    icon: 'flame',
    test: (ctx) => ctx.streak.longest >= 7,
  },
  {
    id: 'treinta-dias-claros',
    nombre: 'Treinta días claros',
    descripcion: 'Un mes de claridad.',
    icon: 'award',
    test: (ctx) => ctx.streak.longest >= 30,
  },
];

export function earnedBadges(ctx: BadgeContext): string[] {
  return BADGES.filter((badge) => badge.test(ctx)).map((badge) => badge.id);
}
```

- [ ] **Step 7: Ejecutar hasta que pasen**

Run: `npm test -- --run src/domain/`
Expected: PASS, toda la suite de dominio.

- [ ] **Step 8: Verificar cobertura del dominio**

Run: `npm run test:coverage -- --run src/domain/`
Expected: `src/domain` ≥ 90 % de líneas.

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "feat(dominio): rachas de claridad con día de perdón y badges derivados"
```

---

### Task 6: Capa de datos con Dexie

**Files:**
- Create: `src/data/db.ts`, `src/data/nodesRepo.ts`, `src/data/activityRepo.ts`, `src/data/settingsRepo.ts`
- Test: `src/data/nodesRepo.test.ts`

**Interfaces:**
- Consumes: todo el dominio.
- Produces:
  - `db: LuminaDb` con tablas `nodes`, `activities`, `settings`.
  - `nodesRepo`: `create(input: CreateNodeInput): Promise<LuminaNode>`, `update(id, patch: Partial<LuminaNode>)`, `toggleDone(id)`, `move(id, newParentId, beforeId, afterId)`, `schedule(id, schedule: Schedule | null)`, `softDelete(id)`, `restore(id)`, `listAll()`, `listByDay(day: string)`, `listIdeas()`, `listSubtree(rootId)`, `search(query: string)`.
  - `CreateNodeInput { text: string; parentId?: NodeId | null; schedule?: Schedule | null; beforeId?: NodeId | null; afterId?: NodeId | null }`.
  - `activityRepo.listAll(): Promise<Activity[]>`.
  - `settingsRepo.get<T>(key, fallback)`, `settingsRepo.set(key, value)`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/data/nodesRepo.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { activityRepo } from './activityRepo';
import { nodesRepo } from './nodesRepo';

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
});

describe('nodesRepo.create', () => {
  it('crea una idea sin horario y registra la captura', async () => {
    const idea = await nodesRepo.create({ text: 'Llamar al banco' });
    expect(idea.schedule).toBeNull();
    expect(idea.parentId).toBeNull();
    const actividades = await activityRepo.listAll();
    expect(actividades.map((a) => a.type)).toEqual(['capture']);
  });

  it('asigna claves de orden crecientes a hermanos sucesivos', async () => {
    const padre = await nodesRepo.create({ text: 'Evento' });
    const primero = await nodesRepo.create({ text: 'A', parentId: padre.id });
    const segundo = await nodesRepo.create({ text: 'B', parentId: padre.id, afterId: primero.id });
    expect(primero.order < segundo.order).toBe(true);
  });
});

describe('nodesRepo.toggleDone', () => {
  it('marca completado, guarda la fecha y registra la actividad', async () => {
    const nodo = await nodesRepo.create({ text: 'Tarea' });
    await nodesRepo.toggleDone(nodo.id);
    const guardado = await db.nodes.get(nodo.id);
    expect(guardado?.done).toBe(true);
    expect(guardado?.completedAt).not.toBeNull();
    const tipos = (await activityRepo.listAll()).map((a) => a.type);
    expect(tipos).toContain('complete');
  });

  it('al desmarcar limpia la fecha de completado', async () => {
    const nodo = await nodesRepo.create({ text: 'Tarea' });
    await nodesRepo.toggleDone(nodo.id);
    await nodesRepo.toggleDone(nodo.id);
    const guardado = await db.nodes.get(nodo.id);
    expect(guardado?.done).toBe(false);
    expect(guardado?.completedAt).toBeNull();
  });
});

describe('nodesRepo.schedule', () => {
  it('convierte una idea en evento sin crear un nodo nuevo', async () => {
    const idea = await nodesRepo.create({ text: 'Estudiar' });
    await nodesRepo.schedule(idea.id, {
      start: '2026-08-13T14:00:00',
      end: '2026-08-13T15:00:00',
      allDay: false,
    });
    const guardado = await db.nodes.get(idea.id);
    expect(guardado?.id).toBe(idea.id);
    expect(guardado?.schedule?.start).toBe('2026-08-13T14:00:00');
    expect(await db.nodes.count()).toBe(1);
    const tipos = (await activityRepo.listAll()).map((a) => a.type);
    expect(tipos).toContain('schedule');
  });

  it('rechaza un horario que termina antes de empezar', async () => {
    const idea = await nodesRepo.create({ text: 'Estudiar' });
    await expect(
      nodesRepo.schedule(idea.id, {
        start: '2026-08-13T15:00:00',
        end: '2026-08-13T14:00:00',
        allDay: false,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_SCHEDULE' }));
  });
});

describe('nodesRepo.move', () => {
  it('rechaza mover un nodo dentro de su propio subárbol', async () => {
    const raiz = await nodesRepo.create({ text: 'Raíz' });
    const hijo = await nodesRepo.create({ text: 'Hijo', parentId: raiz.id });
    await expect(nodesRepo.move(raiz.id, hijo.id, null, null)).rejects.toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it('rechaza un movimiento que supera la profundidad máxima', async () => {
    let padreId: string | null = null;
    for (let i = 0; i <= 20; i += 1) {
      const nodo = await nodesRepo.create({ text: `Nivel ${i}`, parentId: padreId });
      padreId = nodo.id;
    }
    const suelto = await nodesRepo.create({ text: 'Suelto' });
    await expect(nodesRepo.move(suelto.id, padreId, null, null)).rejects.toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });
});

describe('nodesRepo.softDelete y restore', () => {
  it('borra el subárbol completo y lo restaura entero', async () => {
    const raiz = await nodesRepo.create({ text: 'Raíz' });
    const hijo = await nodesRepo.create({ text: 'Hijo', parentId: raiz.id });
    await nodesRepo.softDelete(raiz.id);
    expect((await db.nodes.get(hijo.id))?.deletedAt).not.toBeNull();
    await nodesRepo.restore(raiz.id);
    expect((await db.nodes.get(hijo.id))?.deletedAt).toBeNull();
  });
});

describe('nodesRepo.listByDay', () => {
  it('devuelve solo los eventos que solapan el día pedido', async () => {
    const dentro = await nodesRepo.create({
      text: 'Reunión',
      schedule: { start: '2026-08-13T09:00:00', end: '2026-08-13T10:00:00', allDay: false },
    });
    await nodesRepo.create({
      text: 'Otro día',
      schedule: { start: '2026-08-14T09:00:00', end: '2026-08-14T10:00:00', allDay: false },
    });
    await nodesRepo.create({ text: 'Idea sin fecha' });
    const delDia = await nodesRepo.listByDay('2026-08-13');
    expect(delDia.map((n) => n.id)).toEqual([dentro.id]);
  });
});

describe('nodesRepo.listIdeas', () => {
  it('devuelve solo raíces sin horario', async () => {
    const idea = await nodesRepo.create({ text: 'Idea' });
    await nodesRepo.create({
      text: 'Evento',
      schedule: { start: '2026-08-13T09:00:00', end: '2026-08-13T10:00:00', allDay: false },
    });
    const ideas = await nodesRepo.listIdeas();
    expect(ideas.map((n) => n.id)).toEqual([idea.id]);
  });
});

describe('nodesRepo.search', () => {
  it('busca sin distinguir mayúsculas ni acentos', async () => {
    await nodesRepo.create({ text: 'Revisión de diseño' });
    const resultados = await nodesRepo.search('revision');
    expect(resultados).toHaveLength(1);
  });

  it('excluye los nodos borrados', async () => {
    const nodo = await nodesRepo.create({ text: 'Revisión' });
    await nodesRepo.softDelete(nodo.id);
    expect(await nodesRepo.search('revisión')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/data/nodesRepo.test.ts`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: Implementar la base de datos**

`src/data/db.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Activity, LuminaNode } from '@/domain/types';

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class LuminaDb extends Dexie {
  nodes!: Table<LuminaNode, string>;
  activities!: Table<Activity, string>;
  settings!: Table<SettingRecord, string>;

  constructor(nombre = 'lumina') {
    super(nombre);
    this.version(1).stores({
      nodes: 'id, parentId, deletedAt, schedule.start, *tags',
      activities: 'id, type, nodeId, at',
      settings: 'key',
    });
  }
}

export const db = new LuminaDb();
```

- [ ] **Step 4: Implementar los repositorios**

`src/data/activityRepo.ts`:

```ts
import { db } from './db';
import type { Activity, ActivityType, NodeId } from '@/domain/types';

export const activityRepo = {
  async record(type: ActivityType, nodeId: NodeId, at = new Date()): Promise<void> {
    await db.activities.add({
      id: crypto.randomUUID(),
      type,
      nodeId,
      at: at.toISOString(),
    });
  },

  listAll(): Promise<Activity[]> {
    return db.activities.toArray();
  },
};
```

`src/data/nodesRepo.ts` implementa la interfaz declarada arriba con estas reglas:

```ts
import { db } from './db';
import { activityRepo } from './activityRepo';
import { DomainError } from '@/domain/errors';
import { orderBetween } from '@/domain/order';
import { assertMoveAllowed, descendantsOf, indexNodes } from '@/domain/tree';
import type { LuminaNode, NodeId, Schedule } from '@/domain/types';

export interface CreateNodeInput {
  text: string;
  parentId?: NodeId | null;
  schedule?: Schedule | null;
  beforeId?: NodeId | null;
  afterId?: NodeId | null;
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function validarHorario(schedule: Schedule): void {
  if (new Date(schedule.end).getTime() <= new Date(schedule.start).getTime()) {
    throw new DomainError('INVALID_SCHEDULE', 'El evento debe terminar después de empezar');
  }
}

async function claveDeOrden(
  parentId: NodeId | null,
  beforeId: NodeId | null,
  afterId: NodeId | null,
): Promise<string> {
  const hermanos = indexNodes(await db.nodes.toArray()).childrenOf(parentId);
  const antes = afterId ? (hermanos.find((n) => n.id === afterId)?.order ?? null) : null;
  const despues = beforeId
    ? (hermanos.find((n) => n.id === beforeId)?.order ?? null)
    : afterId
      ? (hermanos[hermanos.findIndex((n) => n.id === afterId) + 1]?.order ?? null)
      : (hermanos.at(-1)?.order ?? null) && null;
  return orderBetween(antes ?? hermanos.at(-1)?.order ?? null, despues);
}
```

Reglas obligatorias de la implementación:

1. `create` escribe el nodo y llama a `activityRepo.record('capture', id)` **dentro de la misma transacción de Dexie** (`db.transaction('rw', db.nodes, db.activities, ...)`), para que un fallo no deje actividad huérfana.
2. `toggleDone` fija `completedAt` al completar y lo vuelve a `null` al desmarcar; registra `'complete'` solo en la transición a completado.
3. `schedule` valida con `validarHorario`, actualiza el mismo registro y registra `'schedule'`. Nunca crea un nodo nuevo.
4. `move` carga todos los nodos, construye el índice, llama a `assertMoveAllowed` **antes** de escribir, y luego calcula la nueva clave con `orderBetween`.
5. `softDelete` marca el nodo y todos sus descendientes con la **misma** marca de tiempo; `restore` limpia exactamente los nodos que comparten esa marca dentro del subárbol.
6. `listByDay(day)` devuelve los eventos cuyo `[start, end)` solapa `[day 00:00, day+1 00:00)`.
7. `listIdeas` devuelve nodos con `parentId === null && schedule === null && deletedAt === null`.
8. `search` compara con `normalizar` sobre `text` y `tags`, excluyendo borrados.
9. Toda escritura actualiza `updatedAt`.

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run src/data/`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "feat(datos): repositorios Dexie con registro de actividad transaccional"
```

---

### Task 7: Export e import versionado

**Files:**
- Create: `src/data/backup.ts`
- Test: `src/data/backup.test.ts`

**Interfaces:**
- Consumes: `db` de Task 6.
- Produces:
  - `BACKUP_SCHEMA_VERSION = 1`.
  - `BackupFile { schemaVersion: number; exportedAt: string; nodes: LuminaNode[]; activities: Activity[] }`.
  - `exportBackup(): Promise<BackupFile>`.
  - `parseBackup(input: unknown): BackupFile` — valida con zod y lanza `DomainError('INVALID_SCHEDULE' | 'NOT_FOUND')` no; lanza `BackupError` con mensaje legible.
  - `importBackup(file: BackupFile, mode: 'replace' | 'merge'): Promise<{ nodos: number; actividades: number }>`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/data/backup.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { nodesRepo } from './nodesRepo';
import { BACKUP_SCHEMA_VERSION, exportBackup, importBackup, parseBackup } from './backup';

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
});

describe('exportBackup', () => {
  it('incluye la versión de esquema y todos los nodos', async () => {
    await nodesRepo.create({ text: 'Idea' });
    const respaldo = await exportBackup();
    expect(respaldo.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(respaldo.nodes).toHaveLength(1);
  });
});

describe('parseBackup', () => {
  it('rechaza un objeto sin versión de esquema', () => {
    expect(() => parseBackup({ nodes: [], activities: [] })).toThrow();
  });

  it('rechaza una versión de esquema futura', () => {
    expect(() =>
      parseBackup({ schemaVersion: 99, exportedAt: '2026-08-12T00:00:00.000Z', nodes: [], activities: [] }),
    ).toThrow(/versión/i);
  });

  it('rechaza nodos con forma inválida', () => {
    expect(() =>
      parseBackup({
        schemaVersion: 1,
        exportedAt: '2026-08-12T00:00:00.000Z',
        nodes: [{ id: 'x' }],
        activities: [],
      }),
    ).toThrow();
  });
});

describe('importBackup', () => {
  it('completa un ciclo export → clear → import sin pérdida', async () => {
    await nodesRepo.create({ text: 'Raíz' });
    const original = await exportBackup();
    await db.nodes.clear();
    await db.activities.clear();
    await importBackup(original, 'replace');
    const recuperado = await exportBackup();
    expect(recuperado.nodes).toEqual(original.nodes);
    expect(recuperado.activities).toEqual(original.activities);
  });

  it('en modo replace descarta los datos previos', async () => {
    await nodesRepo.create({ text: 'Vieja' });
    const vacio = { schemaVersion: 1, exportedAt: '2026-08-12T00:00:00.000Z', nodes: [], activities: [] };
    await importBackup(vacio, 'replace');
    expect(await db.nodes.count()).toBe(0);
  });

  it('en modo merge conserva los datos previos y no duplica por id', async () => {
    const existente = await nodesRepo.create({ text: 'Existente' });
    const respaldo = await exportBackup();
    await nodesRepo.create({ text: 'Nueva' });
    await importBackup(respaldo, 'merge');
    expect(await db.nodes.count()).toBe(2);
    expect((await db.nodes.get(existente.id))?.text).toBe('Existente');
  });
});
```

- [ ] **Step 2: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/data/backup.test.ts`
Expected: FAIL, módulo no encontrado.

- [ ] **Step 3: Implementar**

`src/data/backup.ts` usa zod para validar en el borde:

```ts
import { z } from 'zod';
import { db } from './db';
import type { Activity, LuminaNode } from '@/domain/types';

export const BACKUP_SCHEMA_VERSION = 1;

export class BackupError extends Error {}

const scheduleSchema = z.object({
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
});

const nodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  text: z.string(),
  done: z.boolean(),
  order: z.string(),
  collapsed: z.boolean(),
  schedule: scheduleSchema.nullable(),
  tags: z.array(z.string()),
  colorKey: z.string().nullable(),
  recurrence: z
    .object({
      freq: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number(),
      until: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
});

const activitySchema = z.object({
  id: z.string(),
  type: z.enum(['capture', 'complete', 'schedule']),
  nodeId: z.string(),
  at: z.string(),
});

const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  nodes: z.array(nodeSchema),
  activities: z.array(activitySchema),
});

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  nodes: LuminaNode[];
  activities: Activity[];
}

export async function exportBackup(): Promise<BackupFile> {
  const [nodes, activities] = await Promise.all([db.nodes.toArray(), db.activities.toArray()]);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    activities,
  };
}

export function parseBackup(input: unknown): BackupFile {
  const resultado = backupSchema.safeParse(input);
  if (!resultado.success) {
    throw new BackupError('El archivo no tiene el formato de respaldo de Lumina');
  }
  if (resultado.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError(
      `El respaldo usa una versión ${resultado.data.schemaVersion} más nueva que esta app`,
    );
  }
  return resultado.data as BackupFile;
}

export async function importBackup(
  file: BackupFile,
  mode: 'replace' | 'merge',
): Promise<{ nodos: number; actividades: number }> {
  return db.transaction('rw', db.nodes, db.activities, async () => {
    if (mode === 'replace') {
      await db.nodes.clear();
      await db.activities.clear();
    }
    await db.nodes.bulkPut(file.nodes);
    await db.activities.bulkPut(file.activities);
    return { nodos: file.nodes.length, actividades: file.activities.length };
  });
}
```

- [ ] **Step 4: Ejecutar hasta que pasen**

Run: `npm test -- --run src/data/backup.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/backup.ts src/data/backup.test.ts
git commit -m "feat(datos): respaldo JSON versionado con validación de esquema"
```

---

### Task 8: Hooks de consulta viva y primitivas de interfaz

**Files:**
- Create: `src/hooks/useNodes.ts`, `src/hooks/useNow.ts`, `src/hooks/useStreak.ts`, `src/ui/Button.tsx`, `src/ui/IconButton.tsx`, `src/ui/Card.tsx`, `src/ui/Chip.tsx`, `src/ui/ProgressBar.tsx`, `src/ui/Checkbox.tsx`, `src/ui/EmptyState.tsx`, `src/ui/Sheet.tsx`, `src/ui/icons.tsx`
- Test: `src/hooks/useNow.test.ts`, `src/ui/ProgressBar.test.tsx`

**Interfaces:**
- Consumes: `nodesRepo`, `activityRepo`, dominio.
- Produces:
  - `useAllNodes(): LuminaNode[] | undefined`
  - `useTreeIndex(): TreeIndex`
  - `useDayNodes(day: string): LuminaNode[]`
  - `useIdeas(): LuminaNode[]`
  - `useNode(id: NodeId): LuminaNode | undefined`
  - `useSubtree(rootId: NodeId): LuminaNode[]`
  - `useProgress(rootId: NodeId): Progress`
  - `useNow(intervalMs = 30_000): Date`
  - `useStreak(): StreakResult`, `useBadges(): string[]`
  - Primitivas con `variant`/`size` tipados y estados `hover`, `focus-visible`, `active` explícitos.
  - `icons.tsx` exporta SVG locales: `IconCalendar`, `IconDay`, `IconAdd`, `IconSettings`, `IconSearch`, `IconCheck`, `IconChevron`, `IconSparkles`, `IconClock`, `IconFlame`, `IconAward`, `IconFolderCheck`, `IconTrash`, `IconBack`.

- [ ] **Step 1: Escribir la prueba de `useNow`**

`src/hooks/useNow.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('avanza el instante actual en cada intervalo', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
    const { result } = renderHook(() => useNow(1000));
    const inicial = result.current.getTime();
    act(() => {
      vi.setSystemTime(new Date('2026-08-12T10:00:05.000Z'));
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.getTime()).toBeGreaterThan(inicial);
  });
});
```

- [ ] **Step 2: Escribir la prueba de `ProgressBar`**

`src/ui/ProgressBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('expone el progreso a lectores de pantalla', () => {
    render(<ProgressBar value={0.5} label="Progreso de tareas" />);
    const barra = screen.getByRole('progressbar', { name: 'Progreso de tareas' });
    expect(barra).toHaveAttribute('aria-valuenow', '50');
  });

  it('recorta valores fuera de rango', () => {
    render(<ProgressBar value={1.7} label="Progreso" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
```

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/hooks/useNow.test.ts src/ui/ProgressBar.test.tsx`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 4: Implementar `useNow`**

`src/hooks/useNow.ts`:

```ts
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return ahora;
}
```

- [ ] **Step 5: Implementar los hooks de datos**

`src/hooks/useNodes.ts` usa `useLiveQuery` de `dexie-react-hooks`:

```ts
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import { subtreeProgress, type Progress } from '@/domain/progress';
import { descendantsOf, indexNodes, type TreeIndex } from '@/domain/tree';
import type { LuminaNode, NodeId } from '@/domain/types';

export function useAllNodes(): LuminaNode[] {
  return useLiveQuery(() => db.nodes.toArray(), [], [] as LuminaNode[]);
}

export function useTreeIndex(): TreeIndex {
  const nodes = useAllNodes();
  return useMemo(() => indexNodes(nodes), [nodes]);
}

export function useDayNodes(day: string): LuminaNode[] {
  return useLiveQuery(() => nodesRepo.listByDay(day), [day], [] as LuminaNode[]);
}

export function useIdeas(): LuminaNode[] {
  return useLiveQuery(() => nodesRepo.listIdeas(), [], [] as LuminaNode[]);
}

export function useNode(id: NodeId): LuminaNode | undefined {
  const index = useTreeIndex();
  return index.byId.get(id);
}

export function useSubtree(rootId: NodeId): LuminaNode[] {
  const index = useTreeIndex();
  return useMemo(
    () => (index.byId.has(rootId) ? descendantsOf(index, rootId) : []),
    [index, rootId],
  );
}

export function useProgress(rootId: NodeId): Progress {
  const index = useTreeIndex();
  return useMemo(
    () => (index.byId.has(rootId) ? subtreeProgress(index, rootId) : { done: 0, total: 0, ratio: 0 }),
    [index, rootId],
  );
}
```

`src/hooks/useStreak.ts` combina `activityRepo.listAll()` con `clarityStreak` y `earnedBadges`.

- [ ] **Step 6: Implementar las primitivas**

Cada primitiva es un componente pequeño con clases de Tailwind sobre los tokens. `ProgressBar`:

```tsx
interface ProgressBarProps {
  value: number;
  label: string;
  tone?: 'primary' | 'amber';
}

export function ProgressBar({ value, label, tone = 'primary' }: ProgressBarProps) {
  const porcentaje = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  const color = tone === 'amber' ? 'bg-amber' : 'bg-primary';

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container"
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${porcentaje}%` }} />
    </div>
  );
}
```

Requisitos para todas las primitivas: área táctil mínima de 44 × 44 px en controles, anillo de foco visible (`focus-visible:ring-2 focus-visible:ring-primary`), y ningún color que codifique urgencia.

- [ ] **Step 7: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS, toda la suite.

- [ ] **Step 8: Commit**

```bash
git add src/hooks src/ui
git commit -m "feat(interfaz): hooks de consulta viva y primitivas de diseño accesibles"
```

---

### Task 9: Shell de navegación y vista Día

**Files:**
- Create: `src/routes/Layout.tsx`, `src/routes/DayView.tsx`, `src/ui/BottomNav.tsx`, `src/ui/Sidebar.tsx`, `src/ui/TimelineGrid.tsx`, `src/ui/EventBlock.tsx`, `src/ui/NowIndicator.tsx`, `src/ui/DayStrip.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/ui/TimelineGrid.test.tsx`, `src/routes/DayView.test.tsx`

**Interfaces:**
- Consumes: `useDayNodes`, `useNow`, `useProgress`, `timeState`.
- Produces:
  - `HOUR_HEIGHT_PX = 64`, `topForTime(iso: string, dayStartHour: number): number`, `heightForRange(start, end): number` exportados desde `src/ui/TimelineGrid.tsx`.
  - Rutas registradas: `/`, `/mes`, `/agenda`, `/canvas`, `/nodo/:id`, `/nodo/:id/foco`, `/logros`, `/buscar`, `/ajustes`.

- [ ] **Step 1: Escribir la prueba de posicionamiento**

`src/ui/TimelineGrid.test.tsx`:

```ts
import { describe, expect, it } from 'vitest';
import { HOUR_HEIGHT_PX, heightForRange, topForTime } from './TimelineGrid';

describe('posicionamiento en la línea de tiempo', () => {
  it('coloca las 10:00 a dos horas del inicio a las 8:00', () => {
    expect(topForTime('2026-08-12T10:00:00', 8)).toBe(2 * HOUR_HEIGHT_PX);
  });

  it('convierte hora y media en altura proporcional', () => {
    expect(heightForRange('2026-08-12T10:00:00', '2026-08-12T11:30:00')).toBe(1.5 * HOUR_HEIGHT_PX);
  });

  it('nunca devuelve alturas menores a un bloque mínimo legible', () => {
    expect(heightForRange('2026-08-12T10:00:00', '2026-08-12T10:05:00')).toBeGreaterThanOrEqual(24);
  });
});
```

- [ ] **Step 2: Escribir la prueba de la vista Día**

`src/routes/DayView.test.tsx` renderiza con `MemoryRouter`, siembra dos eventos vía `nodesRepo` y verifica: se muestran ambos títulos, el evento en curso con menos del umbral restante lleva `data-time-state="amber"`, y la vista vacía muestra un texto sin vocabulario de culpa (`expect(screen.getByText(/nada agendado/i))`).

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/ui/TimelineGrid.test.tsx src/routes/DayView.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar la cuadrícula y el bloque**

```ts
export const HOUR_HEIGHT_PX = 64;
export const MIN_BLOCK_PX = 24;

export function topForTime(iso: string, dayStartHour: number): number {
  const fecha = new Date(iso);
  const horas = fecha.getHours() + fecha.getMinutes() / 60 - dayStartHour;
  return horas * HOUR_HEIGHT_PX;
}

export function heightForRange(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(MIN_BLOCK_PX, (ms / 3_600_000) * HOUR_HEIGHT_PX);
}
```

`EventBlock` recibe el nodo y `now`, calcula `timeState`, expone `data-time-state`, aplica tono ámbar sobre el contenedor cuando corresponde, y muestra la barra de progreso de subtareas si el nodo tiene descendientes.

- [ ] **Step 5: Implementar el shell**

`Layout` renderiza barra lateral de 280 px desde `md:` y barra inferior por debajo, con `<main>` y landmarks semánticos (`<nav aria-label="Navegación principal">`). `App.tsx` declara las rutas listadas en Interfaces.

- [ ] **Step 6: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 7: Verificar visualmente**

Run: `npm run dev` y abrir `http://localhost:5173`
Expected: línea de tiempo con horas, indicador de ahora en la posición correcta, navegación inferior en viewport de 390 px.

- [ ] **Step 8: Commit**

```bash
git add src/routes src/ui src/App.tsx
git commit -m "feat(interfaz): shell de navegación y vista Día con línea de tiempo"
```

---

### Task 10: Captura rápida global e Idea Canvas

**Files:**
- Create: `src/ui/QuickCapture.tsx`, `src/routes/CanvasView.tsx`, `src/ui/IdeaCard.tsx`, `src/ui/ScheduleSheet.tsx`, `src/store/uiStore.ts`
- Modify: `src/routes/Layout.tsx`
- Test: `src/ui/QuickCapture.test.tsx`, `src/ui/ScheduleSheet.test.tsx`

**Interfaces:**
- Consumes: `nodesRepo.create`, `nodesRepo.schedule`, `useIdeas`.
- Produces: `useUiStore` (Zustand) con `capturaAbierta: boolean`, `abrirCaptura()`, `cerrarCaptura()`, `nodoEnFoco: NodeId | null`.

- [ ] **Step 1: Escribir la prueba de captura**

`src/ui/QuickCapture.test.tsx` verifica: la tecla `c` abre el campo desde cualquier pantalla; escribir texto y pulsar Enter crea un nodo sin horario y cierra el panel; `Escape` cierra sin crear; el campo tiene `aria-label` y recibe foco al abrir; pulsar `c` mientras se escribe en otro campo de texto **no** abre la captura.

- [ ] **Step 2: Escribir la prueba de programación**

`src/ui/ScheduleSheet.test.tsx` verifica: al confirmar fecha y hora sobre una idea existente, el nodo conserva su `id`; el conteo total de nodos no cambia; se rechaza con mensaje legible un rango donde el fin precede al inicio; el mensaje de error no contiene las palabras prohibidas de las restricciones globales.

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/ui/QuickCapture.test.tsx src/ui/ScheduleSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`QuickCapture` monta un listener global en `document` que ignora el evento cuando `event.target` es `input`, `textarea` o `[contenteditable]`. El campo guarda con Enter, no exige más datos, y muestra confirmación breve sin bloquear.

`CanvasView` lista las ideas en tarjetas con dos acciones: "Programar" (abre `ScheduleSheet`) y "Convertir en carpeta" (abre el detalle). Estado vacío con copy invitacional, sin culpa.

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/routes src/store
git commit -m "feat(interfaz): captura rápida global e Idea Canvas con programación sin conversión"
```

---

### Task 11: Detalle de evento con outliner anidado

**Files:**
- Create: `src/routes/NodeDetail.tsx`, `src/ui/Outliner.tsx`, `src/ui/OutlinerRow.tsx`, `src/ui/DualProgress.tsx`
- Test: `src/ui/Outliner.test.tsx`, `src/ui/DualProgress.test.tsx`

**Interfaces:**
- Consumes: `useNode`, `useSubtree`, `useProgress`, `useNow`, `nodesRepo`.
- Produces: `Outliner` con contrato de teclado: `Enter` crea hermano debajo, `Tab` indenta bajo el hermano anterior, `Shift+Tab` desindenta, `Ctrl/Cmd+Enter` alterna completado, `Backspace` en fila vacía la elimina, flechas arriba/abajo mueven el foco.

- [ ] **Step 1: Escribir las pruebas del outliner**

`src/ui/Outliner.test.tsx` cubre: `Tab` sobre la segunda fila la convierte en hija de la primera; `Tab` sobre la primera fila no hace nada (no hay hermano anterior); `Shift+Tab` en el nivel raíz no hace nada; indentar más allá de `MAX_DEPTH` deja la fila intacta y anuncia el límite con `role="status"`; marcar una subtarea tacha el texto y baja la opacidad; el árbol expone `role="tree"` y las filas `role="treeitem"` con `aria-level` correcto.

- [ ] **Step 2: Escribir la prueba de progreso dual**

`src/ui/DualProgress.test.tsx` verifica que se rendericen dos barras con etiquetas distintas ("Progreso de tareas" y "Tiempo restante"), que la de tiempo pase a tono ámbar cuando `timeState` es `'amber'`, y que un evento sin subtareas no muestre la barra de tareas en lugar de mostrar 0 %.

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/ui/Outliner.test.tsx src/ui/DualProgress.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`OutlinerRow` usa un `contenteditable` controlado con guardado al perder el foco y al pulsar Enter. La indentación visual decrece por nivel (`padding-left: min(nivel, 6) × 16px`) para que 20 niveles sigan siendo legibles en 390 px. Filas por debajo del segundo nivel arrancan colapsadas.

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/routes
git commit -m "feat(interfaz): outliner anidado con teclado completo y progreso dual"
```

---

### Task 12: Focus Mode

**Files:**
- Create: `src/routes/FocusMode.tsx`, `src/ui/FocusTimer.tsx`, `src/domain/focus.ts`
- Test: `src/domain/focus.test.ts`, `src/routes/FocusMode.test.tsx`

**Interfaces:**
- Consumes: `useSubtree`, `useNow`, `nodesRepo.toggleDone`.
- Produces: `nextPendingTask(index: TreeIndex, rootId: NodeId): LuminaNode | null` en `src/domain/focus.ts` — devuelve la primera hoja pendiente en orden de profundidad.

- [ ] **Step 1: Escribir la prueba de dominio**

`src/domain/focus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import { indexNodes } from './tree';
import { nextPendingTask } from './focus';

describe('nextPendingTask', () => {
  it('devuelve la primera hoja pendiente en orden', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U', done: true }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')?.id).toBe('b');
  });

  it('desciende a las subtareas antes de pasar al siguiente hermano', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U' }),
      buildNode({ id: 'a1', parentId: 'a', order: 'U' }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')?.id).toBe('a1');
  });

  it('devuelve null cuando todo está completado', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', done: true }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')).toBeNull();
  });
});
```

- [ ] **Step 2: Escribir la prueba de la pantalla**

`src/routes/FocusMode.test.tsx` verifica: se muestra exactamente una subtarea a la vez; completar avanza a la siguiente; al terminar todas se muestra la celebración; el tiempo restante del bloque se muestra siempre; existe un botón visible para salir del modo.

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/focus.test.ts src/routes/FocusMode.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`nextPendingTask` recorre en profundidad respetando el orden de hermanos y devuelve la primera hoja con `done === false`. `FocusMode` es una pantalla completa sin barra de navegación, con la tarea centrada, tiempo restante arriba y dos acciones grandes.

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes src/ui src/domain
git commit -m "feat(interfaz): Focus Mode de una subtarea a la vez"
```

---

### Task 13: Vistas Mes, Agenda y Búsqueda

**Files:**
- Create: `src/routes/MonthView.tsx`, `src/routes/AgendaView.tsx`, `src/routes/SearchView.tsx`, `src/domain/month.ts`
- Test: `src/domain/month.test.ts`, `src/routes/MonthView.test.tsx`

**Interfaces:**
- Consumes: `useAllNodes`, `nodesRepo.search`.
- Produces: `monthGrid(year: number, month: number): string[][]` — seis filas de siete días `'YYYY-MM-DD'`, incluyendo el desborde de meses vecinos, semana comenzando en domingo (como los mockups).

- [ ] **Step 1: Escribir la prueba de la cuadrícula**

`src/domain/month.test.ts` verifica: siempre 6 × 7 celdas; la primera celda es el domingo anterior o igual al día 1; el mes pedido aparece completo; septiembre de 2023 empieza con el 27 de agosto (caso de los mockups).

- [ ] **Step 2: Escribir la prueba de la vista**

`src/routes/MonthView.test.tsx` verifica que un día con eventos muestre puntos de densidad con `aria-label` que indique la cantidad, y que tocar un día navegue a `/` con ese día seleccionado.

- [ ] **Step 3: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/domain/month.test.ts src/routes/MonthView.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`AgendaView` agrupa por día con encabezados pegajosos. `SearchView` usa `nodesRepo.search` con rebote de 200 ms y muestra el nodo y su ruta de ancestros.

- [ ] **Step 5: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes src/domain
git commit -m "feat(interfaz): vistas de mes, agenda y búsqueda"
```

---

### Task 14: Logros, rachas y celebración

**Files:**
- Create: `src/routes/RewardsView.tsx`, `src/ui/StreakCard.tsx`, `src/ui/BadgeGrid.tsx`, `src/ui/CelebrationSheet.tsx`
- Test: `src/ui/StreakCard.test.tsx`, `src/ui/CelebrationSheet.test.tsx`

**Interfaces:**
- Consumes: `useStreak`, `useBadges`, `BADGES`.
- Produces: `CelebrationSheet` se dispara desde `NodeDetail` y `FocusMode` cuando `progress.total > 0 && progress.done === progress.total`.

- [ ] **Step 1: Escribir las pruebas**

`src/ui/StreakCard.test.tsx` verifica: con racha 0 el texto invita sin culpar y **no** muestra "0 días" en grande ni menciona rachas rotas; con perdón usado muestra un mensaje amable (`/día libre/i`) y nunca la palabra "fallaste"; el récord histórico aparece siempre que sea mayor que la racha actual.

`src/ui/CelebrationSheet.test.tsx` verifica: aparece solo cuando todas las subtareas están completadas; respeta `prefers-reduced-motion` reemplazando la animación por una transición corta; se puede cerrar con `Escape` y devuelve el foco al elemento que la abrió.

- [ ] **Step 2: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/ui/StreakCard.test.tsx src/ui/CelebrationSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Copy obligatoria de `StreakCard` sin racha: "Tu próxima racha empieza cuando quieras." Con perdón usado: "Te tomaste un día libre. La racha sigue."

- [ ] **Step 4: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes src/ui
git commit -m "feat(interfaz): centro de logros con rachas amables y celebración accesible"
```

---

### Task 15: Ajustes, persistencia de almacenamiento y pantalla Acerca de

**Files:**
- Create: `src/routes/SettingsView.tsx`, `src/routes/AboutView.tsx`, `src/ui/AttributionNotice.tsx`, `src/data/storagePersistence.ts`
- Test: `src/routes/SettingsView.test.tsx`, `src/ui/AttributionNotice.test.tsx`

**Interfaces:**
- Consumes: `exportBackup`, `parseBackup`, `importBackup`, `settingsRepo`.
- Produces:
  - `requestPersistentStorage(): Promise<boolean>` que envuelve `navigator.storage.persist()` con detección de soporte.
  - `AttributionNotice` renderiza el crédito exigido por la licencia.

- [ ] **Step 1: Escribir las pruebas**

`src/routes/SettingsView.test.tsx` verifica: el botón de exportar genera un `Blob` con `schemaVersion`; importar un archivo inválido muestra un mensaje legible sin volcar el error crudo; el conmutador de tema persiste en `settings`.

`src/ui/AttributionNotice.test.tsx` verifica que el componente contenga los nombres "Diego Luis Álvarez García" y "Santiago Quiroz Upegui" y el texto "AGPL-3.0".

- [ ] **Step 2: Ejecutar para verificar que fallan**

Run: `npm test -- --run src/routes/SettingsView.test.tsx src/ui/AttributionNotice.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Ajustes incluye: tema (claro/oscuro/sistema), exportar respaldo, importar respaldo con selector de modo, botón "Guardar mis datos en este dispositivo" que llama a `requestPersistentStorage`, y enlace a Acerca de. `AttributionNotice` se monta en Acerca de y en el pie de Ajustes.

- [ ] **Step 4: Ejecutar hasta que pasen**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes src/ui src/data
git commit -m "feat(interfaz): ajustes con respaldo, persistencia de almacenamiento y atribución"
```

---

### Task 16: PWA, licencia y documentación pública

**Files:**
- Create: `LICENSE`, `LICENSE-ADDITIONAL.md`, `NOTICE`, `CREDITS.md`, `README.md`, `CONTRIBUTING.md`, `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`
- Modify: `vite.config.ts`, `index.html`, `package.json`
- Test: `src/pwa.test.ts`

**Interfaces:**
- Consumes: la app completa.
- Produces: build con service worker que precachea el shell; manifest instalable; archivos legales.

- [ ] **Step 1: Descargar el texto de la licencia**

```bash
gh api /licenses/agpl-3.0 --jq .body > LICENSE
head -3 LICENSE
```
Expected: la primera línea contiene "GNU AFFERO GENERAL PUBLIC LICENSE".

- [ ] **Step 2: Escribir el término adicional 7(b)**

`LICENSE-ADDITIONAL.md`:

```markdown
# Términos adicionales (AGPL-3.0, sección 7(b))

Lumina Calendar se distribuye bajo la GNU Affero General Public License v3.0
(archivo `LICENSE`), con el siguiente término adicional autorizado por su
sección 7(b):

> Toda copia, obra derivada o despliegue en red de este programa debe conservar,
> de forma visible para el usuario final, el aviso de atribución que aparece en
> la pantalla "Acerca de" de la aplicación y en el archivo `NOTICE`:
>
> **Lumina Calendar — creado por Diego Luis Álvarez García y Santiago Quiroz Upegui.**
>
> Eliminar, ocultar o hacer inaccesible ese aviso constituye una violación de la
> licencia y termina automáticamente los derechos concedidos por ella.

Este término no restringe ninguna de las libertades garantizadas por la AGPL:
usar, estudiar, modificar y redistribuir el programa siguen permitidos.
```

`NOTICE`:

```
Lumina Calendar
Copyright (C) 2026 Diego Luis Álvarez García y Santiago Quiroz Upegui

Este programa es software libre bajo la GNU Affero General Public License v3.0
con un término adicional de atribución (ver LICENSE-ADDITIONAL.md).
```

- [ ] **Step 3: Escribir README y CREDITS**

`README.md` cubre: qué es, capturas de las pantallas principales, filosofía de bajo estímulo con las tres decisiones de diseño derivadas de la investigación, instalación (`npm install`, `npm run dev`), pruebas, build, exportación de datos, licencia con la cláusula de atribución explicada en una frase, y créditos. `CREDITS.md` acredita a Diego como autor del concepto, el PRD y los mockups originales.

- [ ] **Step 4: Configurar la PWA**

Añadir `VitePWA` a `vite.config.ts` con `registerType: 'autoUpdate'`, `manifest` en español (`name: 'Lumina Calendar'`, `short_name: 'Lumina'`, `theme_color: '#4648d4'`, `background_color: '#f8f9ff'`, `display: 'standalone'`, `lang: 'es'`), y `workbox.globPatterns` incluyendo `**/*.{js,css,html,woff2,png,svg}`.

- [ ] **Step 5: Escribir la prueba del manifest**

`src/pwa.test.ts` lee `vite.config.ts` compilado o el manifest generado y verifica que `theme_color` sea `#4648d4`, que haya iconos 192 y 512, y que `display` sea `standalone`.

- [ ] **Step 6: Verificar el build offline**

```bash
npm run build
npm run preview
```
Expected: en DevTools, Application → Service Workers muestra el SW activo; con "Offline" marcado, recargar sigue mostrando la app.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(configuración): PWA instalable, licencia AGPL con atribución y documentación pública"
```

---

### Task 17: End-to-end e integración continua

**Files:**
- Create: `playwright.config.ts`, `e2e/flujo-completo.spec.ts`, `e2e/accesibilidad.spec.ts`, `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: la aplicación construida.
- Produces: `npm run e2e`; CI que ejecuta lint, pruebas unitarias con cobertura, build y E2E en cada push y pull request.

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Escribir el E2E del flujo completo**

`e2e/flujo-completo.spec.ts` recorre: abrir la app → pulsar `c` → escribir "Preparar demo" → Enter → ir a `/canvas` y ver la idea → programarla para hoy → verificar que aparece en la vista Día → abrir su detalle → añadir tres subtareas con Enter → indentar la tercera con Tab → completar las tres → ver la celebración → ir a Ajustes → exportar → recargar con la base vacía → importar → verificar que el evento y sus subtareas siguen ahí.

- [ ] **Step 3: Escribir el E2E de accesibilidad**

`e2e/accesibilidad.spec.ts` verifica: navegación completa por teclado desde la vista Día hasta completar una subtarea sin usar el ratón; con `prefers-reduced-motion: reduce` la celebración no anima; contraste de texto principal sobre fondo cumple AA en tema claro y oscuro.

- [ ] **Step 4: Ejecutar los E2E**

Run: `npm run e2e`
Expected: PASS, ambos archivos.

- [ ] **Step 5: Escribir el workflow de CI**

`.github/workflows/ci.yml` con un job en `ubuntu-latest`, Node 22, `npm ci`, `npm run lint`, `npm run test:coverage -- --run`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run e2e`, y subida del reporte de Playwright como artefacto en caso de fallo.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: flujo end-to-end completo y pipeline de integración continua"
```

---

### Task 18: Publicación del repositorio

**Files:**
- Modify: `README.md` (insignias de CI)

- [ ] **Step 1: Verificar la cuenta de GitHub correcta**

```bash
GITHUB_TOKEN= gh auth status
```
Expected: cuenta activa `santiquiroz`. La variable `GITHUB_TOKEN` del entorno apunta a la cuenta de trabajo y debe neutralizarse en cada invocación de `gh`.

- [ ] **Step 2: Verificar que no hay secretos ni datos personales**

```bash
git log --oneline
git grep -nEi "api[_-]?key|secret|token|password" -- . ':!package-lock.json' || echo "sin coincidencias"
```
Expected: sin coincidencias reales.

- [ ] **Step 3: Crear el repositorio y publicar**

```bash
GITHUB_TOKEN= gh repo create lumina-calendar --public \
  --description "Calendario local-first donde cada evento es una carpeta de tareas anidables. PWA de bajo estímulo." \
  --source=. --remote=origin --push
```

- [ ] **Step 4: Configurar temas y añadir a Diego como colaborador**

```bash
GITHUB_TOKEN= gh repo edit --add-topic calendar,pwa,local-first,adhd,productivity,react,typescript,agpl
```

Preguntar al usuario el usuario de GitHub de Diego antes de invitarlo; no inventar un handle.

- [ ] **Step 5: Verificar el resultado**

```bash
GITHUB_TOKEN= gh repo view --web
```
Expected: README visible, licencia detectada como AGPL-3.0, CI en verde.

---

## Self-Review

**Cobertura del spec:** §3 nodo unificado → Tasks 3 y 6. §4 modelo → Task 3. §5 funciones derivadas → Tasks 4 y 5. §6 capas → estructura de Tasks 2-8. §7 rutas → Tasks 9-15. §8 decisiones de interacción → Tasks 10 (captura), 12 (foco), 9-11 (reprogramar y ausencia de urgencia), 11 (densidad). §9 stack → Task 1. §10 pruebas → cada tarea más Task 17. §11 licencia → Tasks 15 y 16. §13 riesgos → Task 11 (legibilidad), Task 15 (persistencia y export), este plan por fases (alcance).

**Vacío conocido y aceptado:** la recurrencia (`Recurrence` en el modelo) queda declarada en tipos y respaldos pero sin interfaz de usuario en v1; el PRD la menciona como pregunta al completar una tarea. Si se quiere en v1, es una tarea adicional entre las 11 y 12; se deja fuera para no inflar la primera entrega.

**Consistencia de tipos:** `LuminaNode`, `Schedule`, `Activity`, `Progress`, `TimeState`, `StreakResult`, `TreeIndex`, `BadgeContext` se definen una sola vez (Tasks 3-5) y se consumen con los mismos nombres en `data`, `hooks` y `ui`. `orderBetween`, `indexNodes`, `assertMoveAllowed`, `subtreeProgress`, `timeState`, `clarityStreak`, `earnedBadges`, `nextPendingTask` conservan su firma en todas las referencias.
