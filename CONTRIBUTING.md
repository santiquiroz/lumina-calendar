# Cómo contribuir

Gracias por el interés. Lumina es un proyecto chico con reglas claras; seguirlas
hace que revisar tu cambio sea rápido.

## Antes de escribir código

Abrí un issue describiendo el problema, no la solución. Si tu propuesta cambia
la filosofía del producto (por ejemplo, agregar etiquetas de urgencia o alertas
que presionen), va a ser rechazada aunque el código esté impecable: eso es
justamente lo que Lumina evita a propósito.

## Reglas de la base de código

1. **Las capas no se cruzan.** `domain` no importa nada; `data` importa
   `domain`; `hooks` importa `data` y `domain`; `ui` y `routes` solo importan
   `hooks`. Un import que rompa esta dirección no entra.
2. **Lo derivable se calcula.** Progreso, estado de tiempo, rachas y logros
   nunca se guardan en la base.
3. **Nada de CDN.** Toda dependencia viaja en el bundle. La app tiene que
   funcionar sin red.
4. **Vocabulario.** Ninguna cadena visible puede decir «fallaste», «vencido»,
   «atrasado», «perdiste» ni «urgente». Reprogramar no es un fracaso.
5. **Accesibilidad.** Área táctil mínima de 44 px, foco visible, contraste AA en
   ambos temas y `prefers-reduced-motion` respetado de verdad.
6. **Pruebas primero.** Escribí la prueba que falla, después el código. El
   dominio se mantiene por encima del 90 % de cobertura y el proyecto por encima
   del 85 %.

## Flujo

```bash
npm install
npm run test:run      # deben pasar todas antes de empezar
# escribí la prueba que falla, después el código
npm run lint
npm run test:coverage
npm run build
```

Los mensajes de commit van en español y agrupados por capa: `Dominio:`,
`Aplicación:`, `Infraestructura:`, `Configuración:`, `Pruebas:`. Mirá el
historial para el formato exacto.

## Licencia de tus aportes

Al contribuir aceptás que tu código se distribuya bajo AGPL-3.0 con el término
adicional de atribución descrito en [`LICENSE-ADDITIONAL.md`](LICENSE-ADDITIONAL.md).
Si tu aporte es sustancial, agregate a [`CREDITS.md`](CREDITS.md) en el mismo
pull request.
