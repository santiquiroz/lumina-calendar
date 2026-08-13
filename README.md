# Lumina Calendar

Un calendario donde **cada evento es una carpeta de tareas anidables** y las
ideas sin fecha tienen su propio lugar antes de convertirse en compromisos.
Funciona entero en tu dispositivo: sin cuentas, sin servidor, sin red.

[![CI](https://github.com/santiquiroz/lumina-calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/santiquiroz/lumina-calendar/actions/workflows/ci.yml)
![Licencia](https://img.shields.io/badge/licencia-AGPL--3.0%20%2B%20atribuci%C3%B3n-4648d4)
![Pruebas](https://img.shields.io/badge/pruebas-214%20unitarias%20%2B%2016%20e2e-4648d4)
![Cobertura](https://img.shields.io/badge/cobertura-91%25-4648d4)

## Por qué existe

Las herramientas de productividad fallan de forma predecible: el bloqueo rígido
de calendario convierte cada desvío en un fracaso visible, las listas crecen
hasta ser inmirables, y capturar una idea cuesta más fricción que perderla.

Lumina toma tres decisiones a partir de eso:

1. **Vaciás primero, ordenás después.** El Idea Canvas acepta cualquier cosa sin
   pedir fecha, categoría ni prioridad. Programarla es un segundo paso opcional.
2. **Reprogramar no es fallar.** No existen etiquetas de urgencia, badges de
   vencimiento ni contadores en rojo. El aviso de que un bloque termina es un
   cambio suave a ámbar, proporcional a la duración del bloque.
3. **Una cosa a la vez.** El modo foco muestra una sola subtarea, el tiempo que
   queda y dos acciones. Nada más.

## Cómo funciona por dentro

Todo el sistema es **un solo tipo de objeto**:

| Concepto | Cómo se representa |
|---|---|
| Idea | nodo sin horario y sin padre |
| Evento | nodo con horario |
| Subtarea | nodo con padre |
| Programar una idea | asignarle horario al mismo nodo |

Por eso convertir una idea en evento no crea, copia ni migra nada, y la
anidación de hasta 20 niveles sale gratis del propio modelo. El progreso, el
estado de tiempo, las rachas y los logros se **calculan**; no se guardan.

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

```bash
npm run test:run       # 214 pruebas unitarias y de componentes
npm run test:coverage  # con umbrales de cobertura
npm run lint           # TypeScript en modo estricto
npm run build          # build de producción + service worker
npm run e2e            # pruebas end to end con Playwright
npm run icons          # regenera los iconos PNG desde los SVG
```

## Android

Además de la PWA hay un APK: la misma app web empaquetada con Capacitor, con los
archivos dentro del APK. No carga nada de la red y no necesita hosting.

Descargalo desde [Releases](https://github.com/santiquiroz/lumina-calendar/releases)
e instalalo permitiendo orígenes desconocidos, o compilalo vos:

```bash
npm run android:sync                        # build web + copiar a android/
cd android && ./gradlew assembleRelease     # APK en app/build/outputs/apk/release/
```

Para firmar tu propio release, creá `android/keystore.properties` (está ignorado
por git) apuntando a tu keystore:

```properties
storeFile=C:/ruta/a/tu-keystore.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Sin ese archivo el build de release sale sin firmar, que sirve para probar pero
no para instalar en un teléfono.

### Avisos de versión nueva

Como Lumina se instala por sideload y no por Play Store, la app mira ella misma
las publicaciones del repositorio: consulta `releases/latest` como mucho dos
veces al día, compara la etiqueta con la versión instalada y, si hay una más
nueva, muestra un banner con el enlace al APK. Podés posponer una versión
concreta y no vuelve a insistir con esa; la siguiente sí avisa. Sin red no pasa
nada: el chequeo falla en silencio. También hay un botón manual en Ajustes.

## Traer calendarios de otro lado

Lumina **solo lee**: nunca escribe en tus calendarios, y nada de lo que importa
sale de tu dispositivo. Hay tres caminos, según dónde estés:

| Camino | Dónde funciona | Qué cubre |
|---|---|---|
| Calendarios del teléfono | App de Android | Todo lo que tu teléfono ya sincroniza: Google, Outlook, Samsung, Exchange |
| Suscripción por dirección iCal | App y navegador | Google, Outlook, iCloud y cualquier calendario que publique un `.ics` |
| Archivo `.ics` | App y navegador | Exportaciones puntuales de cualquier calendario |

El primero es el recomendado en el teléfono: no necesita cuentas, ni permisos de
Google, ni que Lumina hable con ningún servidor. Lee el calendario que Android ya
tiene sincronizado, con permiso de solo lectura, y trae los eventos **ya
expandidos**, así que las repeticiones aparecen bien sin que Lumina tenga que
interpretar reglas de recurrencia.

Los eventos importados se marcan con un punto y se pueden desglosar en subtareas
como cualquier otro. Al volver a sincronizar se actualiza su nombre y su horario,
pero **tus subtareas se conservan**; si el evento desaparece del origen,
desaparece de Lumina. Si la fuente no responde, no se borra nada: una caída de
red no puede leerse como "ya no hay eventos".

Un límite conocido de las dos vías `.ics`: **los eventos repetidos entran solo
una vez**, porque Lumina todavía no interpreta reglas de recurrencia. Los
calendarios del teléfono no tienen ese problema, porque Android entrega las
repeticiones ya expandidas. Si vivís de eventos que se repiten, usá esa vía.

## Avisos con la app cerrada

La versión de Android programa dos notificaciones por bloque: una cuando empieza
y otra cuando entra en ámbar, con el mismo margen proporcional que ves en
pantalla. Se reprograman solas cuando cambiás algo y se pueden apagar enteras
desde Ajustes. En el navegador esto no existe: es una limitación real de las PWA,
no una decisión.

## Tus datos

Viven en IndexedDB, en tu navegador. Nadie más los ve porque no hay a dónde
mandarlos. Eso tiene una contrapartida honesta: **si perdés el dispositivo,
perdés los datos**. Ajustes tiene un botón de exportar respaldo en JSON y otro
para volver a importarlo; el formato está versionado y validado desde la v1.

También podés pedirle al navegador que marque el almacenamiento como permanente
para que no lo purgue cuando necesite espacio.

## Límite conocido

Una PWA no puede disparar notificaciones fiables con la aplicación cerrada,
sobre todo en iOS. v1 entrega avisos visuales dentro de la app. Los recordatorios
con la app cerrada requieren empaquetado nativo y están fuera de esta versión.

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · Dexie (IndexedDB) · Zustand ·
React Router · Zod · Vitest · Testing Library · Playwright.

Ninguna dependencia se carga desde un CDN en tiempo de ejecución: las fuentes,
los iconos y las librerías viajan en el bundle. La app funciona completa en un
avión.

## Documentación

- [Diseño y decisiones](docs/superpowers/specs/2026-08-12-lumina-calendar-design.md)
- [Plan de implementación](docs/superpowers/plans/2026-08-12-lumina-calendar-v1.md)
- [Mockups y design system originales](design/stitch/)
- [Cómo contribuir](CONTRIBUTING.md)

## Licencia

**AGPL-3.0 con un término adicional de atribución** (sección 7(b) de la propia
licencia). Podés usar, estudiar, modificar, redistribuir y hospedar Lumina,
incluso comercialmente. La única condición extra: el aviso

> Lumina Calendar — creado por Diego Luis Álvarez García y Santiago Quiroz Upegui.

debe seguir visible dentro de la aplicación en cualquier copia, derivado o
despliegue. Los detalles están en [`LICENSE`](LICENSE) y
[`LICENSE-ADDITIONAL.md`](LICENSE-ADDITIONAL.md).
