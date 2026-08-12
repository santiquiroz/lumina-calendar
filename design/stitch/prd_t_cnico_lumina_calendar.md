# Especificaciones Técnicas y de Diseño: Lumina Calendar

## 1. Visión General del Producto
**Lumina Calendar** es una aplicación de gestión del tiempo y productividad orientada al bienestar mental. Su arquitectura se basa en el concepto de "vaciado cognitivo" y organización jerárquica profunda, diseñada para reducir la ansiedad y la sobrecarga sensorial.

## 2. Identidad Visual (Design System)
- **Nombre:** Lumina Calendar
- **Tipografía:** Hanken Grotesk (Limpia, moderna, legible).
- **Paleta de Colores:**
  - Primario: `#6366f1` (Indigo suave)
  - Superficie: `#f8f9ff` (Azul blanquecino muy tenue)
  - Contenedores: `#eff4ff`
  - Alertas de Tiempo: Tonos Ámbar/Naranja suave (para transiciones no estresantes).
- **Estética:** Bordes redondeados (8px - 12px), sombras sutiles, transiciones fluidas y "bajo estímulo".

## 3. Arquitectura de Información y Módulos Core

### A. Idea Canvas (Vaciado Mental)
- **Función:** Captura de texto sin formato ni estructura temporal.
- **Lógica:** Las ideas se almacenan como tarjetas independientes.
- **Acción Crucial:** "Convertir en Evento". Al activar, debe abrir un flujo que asigne Fecha, Hora y Carpeta de destino.

### B. Eventos como Carpetas (Jerarquía Estructurada)
- **Innovación:** Los eventos en el calendario no son puntos finales, sino **contenedores (carpetas)**.
- **Anidación:** Soporta hasta 20 niveles de subtareas (estilo Workflowy).
- **Estado de Tarea:** Checkboxes interactivos. Al marcar, el texto debe tacharse y reducir opacidad.
- **Recursividad:** Al completar una tarea, el sistema debe preguntar si se repite (diario, semanal, etc.).

### C. Sistema de Monitoreo Dual (Barras de Progreso)
Cada carpeta/evento debe mostrar visualmente:
1. **Progreso de Tareas:** `%` calculado según (subtareas completadas / total de subtareas).
2. **Tiempo Restante:** Barra de cuenta atrás visual que cambia a **Ámbar** cuando falta poco tiempo para el fin del bloque horario.

## 4. Gamificación y Refuerzo Positivo
- **Días de Claridad:** Sistema de rachas (streaks) por uso constante.
- **Badges:** Reconocimientos por hitos (ej: "Mind Dump Master" al capturar 5 ideas).
- **Pantalla de Celebración:** Al completar todas las tareas de una carpeta, mostrar estadísticas de tiempo ahorrado y validación visual.

## 5. Especificaciones de Interacción
- **Transiciones:** Todas las expansiones de subniveles deben ser animadas y suaves.
- **Navegación:**
  - Mobile: Bottom Navigation Bar (Mes, Agenda, Añadir, Ajustes).
  - Web/Desktop: Sidebar persistente.

## 6. Referencias de Pantallas Existentes
- **{{DATA:SCREEN:SCREEN_7}}**: Idea Canvas.
- **{{DATA:SCREEN:SCREEN_31}}**: Detalle de anidación profunda.
- **{{DATA:SCREEN:SCREEN_14}}**: Visualización de barras duales.
- **{{DATA:SCREEN:SCREEN_10}}**: Centro de logros.

---
*Este documento sirve como PRD (Product Requirements Document) para la implementación técnica de Lumina Calendar.*