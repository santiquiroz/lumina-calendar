# Lumina Calendar — Diseño v1

Fecha: 2026-08-12
Autores: Diego Luis Álvarez García (concepto, mockups, PRD), Santiago Quiroz Upegui (arquitectura, implementación)
Estado: aprobado para implementación

## 1. Problema

Las herramientas de productividad existentes fallan de forma predecible para su público objetivo: el bloqueo rígido de calendario convierte cada desvío en un fracaso visible, las listas crecen hasta ser inmirables, y capturar una idea cuesta más fricción que perderla. La investigación de comunidad de los últimos 30 días (Reddit, YouTube, TikTok, HN, GitHub; ver §12) confirma tres cosas: el vaciado mental antes de planificar es el ciclo que retiene usuarios, la captura sin fricción es requisito de entrada y no pulido, y el enemigo real del producto es el ciclo de abandonar una herramienta para comprar la siguiente.

Lumina Calendar es un calendario local-first donde **cada evento es una carpeta de tareas anidables** y donde las ideas sin fecha tienen un lugar legítimo antes de convertirse en compromisos.

## 2. Alcance

### En v1

- Idea Canvas (vaciado mental sin fecha ni estructura)
- Eventos como carpetas con subtareas anidadas hasta 20 niveles
- Vistas Día (línea de tiempo), Mes, Agenda
- Progreso dual: porcentaje de subtareas + tiempo restante con alerta ámbar
- Focus Mode: una subtarea a la vez
- Reprogramar como gesto barato (arrastrar), nunca como "fallaste"
- Rachas de "Días de Claridad" con día de perdón, badges y pantalla de celebración
- Búsqueda
- Export/import JSON completo
- PWA instalable, 100 % offline
- Tema claro y oscuro, movimiento reducido respetado

### Fuera de v1 (backlog v2)

Sincronización entre dispositivos, cuentas de usuario, colaboración, importar Google Calendar / CalDAV, notificaciones push con la app cerrada, adjuntos, widgets nativos.

### Restricción conocida y aceptada

Una PWA no puede disparar notificaciones fiables con la aplicación cerrada, especialmente en iOS. v1 entrega alertas visuales dentro de la app y `Notification` del navegador solo mientras la pestaña vive. Recordatorios reales con la app cerrada requieren empaquetado nativo y quedan para v2.

## 3. Decisión de arquitectura: el nodo unificado

Todo objeto del sistema es el mismo tipo. No hay entidades separadas para idea, evento y subtarea.

| Concepto de producto | Representación |
|---|---|
| Idea (vaciado mental) | nodo sin `schedule` y sin `parentId` |
| Evento (carpeta) | nodo con `schedule` |
| Subtarea | nodo con `parentId` |
| "Programar idea" | asignar `schedule` al nodo existente |

Consecuencias buscadas: convertir una idea en evento no crea, copia ni migra nada; la anidación infinita sale gratis del propio modelo; hay un solo repositorio de datos y un solo conjunto de operaciones de árbol que probar.

Alternativas descartadas: entidades separadas `Event`/`Task`/`Idea` (obliga a lógica de conversión, duplica CRUD y contradice la premisa del PRD de que el evento *es* la carpeta); CRDT desde v1 (resuelve una sincronización que v1 no tiene, a costa de bundle y complejidad — YAGNI). La capa de almacenamiento queda aislada para que un CRDT pueda entrar en v2 sin tocar el dominio.

## 4. Modelo de datos

```ts
type NodeId = string; // UUID v7: ordenable por tiempo de creación

interface LuminaNode {
  id: NodeId;
  parentId: NodeId | null;
  text: string;
  done: boolean;
  order: string;              // índice fraccional: insertar sin reescribir hermanos
  collapsed: boolean;
  schedule: Schedule | null;  // su presencia define "es un evento"
  tags: string[];
  colorKey: EventColorKey | null;
  recurrence: Recurrence | null;
  createdAt: string;          // ISO 8601
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;   // borrado suave, habilita deshacer
}

interface Schedule {
  start: string;              // ISO local
  end: string;
  allDay: boolean;
}

interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  until: string | null;
}

interface Activity {
  id: string;
  type: 'capture' | 'complete' | 'schedule';
  nodeId: NodeId;
  at: string;                 // ISO
}
```

`Activity` es un registro append-only. Rachas, badges y estadísticas se **derivan** de él; no existe un contador de rachas almacenado que pueda desincronizarse.

### Invariantes del dominio

1. Profundidad máxima de 20 niveles (`MAX_DEPTH`), validada al mover y al crear.
2. Mover un nodo dentro de su propio subárbol es un error, no un no-op silencioso.
3. `schedule.end` debe ser posterior a `schedule.start`.
4. Completar un padre no completa a sus hijos, y viceversa. El progreso siempre se calcula.
5. Un nodo borrado conserva sus descendientes borrados con la misma marca de tiempo, para que deshacer restaure el subárbol completo.

## 5. Funciones derivadas (dominio puro)

- `subtreeProgress(nodes, rootId) -> { done, total, ratio }` — cuenta todos los descendientes del nodo, excluyéndolo a él.
- `timeState(schedule, now) -> 'upcoming' | 'calm' | 'amber' | 'ended'`.
- `clarityStreak(activities, today) -> { current, longest, forgivenessUsed }`.
- `earnedBadges(activities, nodes) -> Badge[]`.

### Umbral ámbar

El umbral **no es una constante absoluta**. Un bloque de 15 minutos y uno de 8 horas no pueden compartir el mismo margen:

```
umbralÁmbar = clamp(0.2 × duración, 1 min, 15 min)
```

Un evento de 8 h entra en ámbar a los 15 minutos finales; uno de 15 min, a los 3. Aplicar un margen fijo produce un aviso inútil en un extremo y permanente en el otro.

### Rachas con día de perdón

Un "Día de Claridad" es un día con al menos una captura o una tarea completada. La racha sobrevive a **un** día perdido dentro de una ventana móvil de 7 días. La interfaz nunca muestra el contador cayendo a cero ni lenguaje de castigo: si la racha se rompe, se muestra el récord histórico y la racha nueva empieza en silencio. Esta decisión responde directamente a la evidencia de investigación: este público abandona la herramienta cuando la herramienta lo hace sentir culpable.

## 6. Capas

```
src/
  domain/    TypeScript puro. Sin React, sin Dexie, sin DOM.
             Operaciones de árbol, progreso, estado de tiempo, rachas, badges,
             índice fraccional, validaciones. Aquí vive el TDD.
  data/      Esquema Dexie (IndexedDB), repositorios, migraciones,
             export/import JSON versionado.
  hooks/     Consultas vivas con dexie-react-hooks. Puente datos → UI.
  ui/        Componentes presentacionales y primitivas de diseño.
  routes/    Una pantalla por ruta.
  design/    tokens.css derivado de DESIGN.md.
```

Regla de dependencias: `domain` no importa nada de las otras capas. `data` importa `domain`. `hooks` importa `data` y `domain`. `ui` y `routes` no importan `data` directamente, solo `hooks`.

## 7. Rutas y pantallas

| Ruta | Pantalla | Origen en los mockups |
|---|---|---|
| `/` | Día: línea de tiempo 64 px/hora, indicador de ahora | vista_diaria_* |
| `/mes` | Cuadrícula mensual con puntos de densidad | vista_mensual_* |
| `/agenda` | Lista cronológica agrupada por día | vista_diaria_con_indicadores_de_carpeta |
| `/canvas` | Idea Canvas: captura libre en tarjetas | idea_canvas_ideacion_libre |
| `/nodo/:id` | Detalle de evento con outliner anidado y progreso dual | detalle_de_evento_* |
| `/nodo/:id/foco` | Focus Mode: una subtarea a la vez + temporizador | detalle_de_evento_interactivo |
| `/logros` | Rachas, badges, celebración | centro_de_recompensas_y_logros |
| `/buscar` | Búsqueda sobre texto y etiquetas | buscador_* |
| `/ajustes` | Tema, export/import, Acerca de y créditos | — |

Navegación: barra inferior en móvil (Mes, Día, Añadir, Ajustes), barra lateral fija de 280 px en escritorio.

## 8. Decisiones de interacción derivadas de la investigación

1. **Captura global sin fricción**: tecla `c` en cualquier pantalla y botón flotante en móvil abren una entrada de texto que guarda al pulsar Enter. Sin campos obligatorios, sin selector de fecha, sin categoría.
2. **Focus Mode como función central, no accesoria**: muestra una sola subtarea, el tiempo restante del bloque y dos acciones (completar, siguiente). Con temporizador opcional de sesión corta.
3. **Reprogramar es arrastrar**: desde la vista Día y desde la propia alerta ámbar. Sin diálogo de confirmación y sin vocabulario de fracaso en ninguna cadena de texto.
4. **Sin etiquetas de urgencia**: no hay prioridades rojas ni badges de "vencido". El color codifica categoría, nunca presión.
5. **Densidad controlada**: el outliner colapsa por defecto los niveles bajo el segundo; expandir es explícito.

## 9. Stack técnico

| Área | Elección | Motivo |
|---|---|---|
| Build | Vite + React + TypeScript | Los mockups ya son HTML+Tailwind; el port es directo |
| Estilos | Tailwind CSS v4 con `@theme` | Los tokens de DESIGN.md se expresan como variables CSS |
| Datos | Dexie sobre IndexedDB + dexie-react-hooks | Consultas vivas, offline real, sin servidor |
| Estado de UI | Zustand | Solo estado efímero: selección, foco, hoja abierta |
| Rutas | React Router | Suficiente, sin dependencias de servidor |
| PWA | vite-plugin-pwa (Workbox) | Instalable y offline |
| Tipografía | Hanken Grotesk autohospedada | Un CDN de fuentes rompe la promesa offline |
| Iconos | SVG locales | Misma razón: Material Symbols por CDN no sobrevive sin red |
| Pruebas | Vitest + Testing Library + fake-indexeddb | Dominio y datos sin navegador |
| E2E | Playwright | Flujo completo en navegador real |

Ninguna dependencia de tiempo de ejecución se sirve desde un CDN. La aplicación debe funcionar completa en un avión.

## 10. Estrategia de pruebas

- `domain/`: TDD estricto, objetivo de cobertura ≥ 90 %. Casos obligatorios: profundidad 20 y 21, mover a descendiente propio, ámbar en evento de 15 min y de 8 h, racha con exactamente un día perdido y con dos, progreso con subárbol vacío.
- `data/`: pruebas de repositorios contra `fake-indexeddb`, incluido un ciclo completo export → import → comparación estructural.
- `ui/`: Testing Library sobre outliner (teclado) y línea de tiempo (posicionamiento).
- E2E: capturar idea → programarla → abrir su outliner → completar subtareas → ver celebración → exportar → reimportar en perfil limpio.
- Cobertura global objetivo: ≥ 80 %.

## 11. Licencia y créditos

**AGPL-3.0-only + término adicional bajo la sección 7(b)**, que es el mecanismo estándar para exigir la conservación de avisos de atribución razonables. Cualquier copia, derivado o despliegue debe conservar visible el crédito a Diego Luis Álvarez García y Santiago Quiroz Upegui en la pantalla "Acerca de" y en el README.

Archivos: `LICENSE` (texto AGPL-3.0 íntegro), `LICENSE-ADDITIONAL.md` (término 7(b)), `NOTICE`, `CREDITS.md`.

La pantalla "Acerca de" incluye el crédito como componente de la aplicación, no como texto suelto, y su eliminación en un derivado constituye incumplimiento de licencia.

## 12. Base de investigación

Investigación de comunidad del 2026-07-13 al 2026-08-12: 18 hilos de Reddit (10.038 votos), 10 videos de YouTube con transcripción, 19 de TikTok (3,6 M de vistas), 16 historias de Hacker News, 7 resultados de GitHub. X/Twitter no cubierto en esa corrida. Datos crudos en `~/Documents/Last30Days/adhd-calendar-and-task-apps-brain-dump-nested-outliner-tasks-local-first-raw-v3.md`.

Hallazgos que cambiaron el diseño: el bloqueo rígido de calendario como principal modo de fallo (de ahí §8.3), la fricción de captura como requisito de entrada (§8.1), el límite de tareas visibles y el rechazo explícito a las etiquetas de urgencia (§8.4, §8.5), y la advertencia sobre gamificación culposa (§5, rachas con perdón).

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| El outliner con 20 niveles se vuelve ilegible en móvil | Colapso por defecto e indentación decreciente por nivel; Focus Mode como salida |
| IndexedDB puede ser purgado por el navegador | `navigator.storage.persist()` al primer uso y recordatorio de exportar en Ajustes |
| Sin sincronización, un dispositivo perdido pierde todo | Export JSON de un clic; el formato es estable y versionado desde v1 |
| Alcance de v1 demasiado grande | Fases entregables por separado; el plan de implementación las ordena |
