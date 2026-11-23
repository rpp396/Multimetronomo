# Multimetrónomo

Metrónomo web para el celular. Interfaz en español. Sigue la estructura y el estilo de DandEtudeDuR (sin build, scripts clásicos, mismos colores y tipografías, CSP estricta, pruebas con Playwright).

## Mapa del código

**Scripts clásicos, no módulos ES** (los módulos no cargan con `file://`): comparten el ámbito global. El orden de `index.html` importa: el código que se ejecuta al cargar un archivo solo puede usar lo de ese archivo y los anteriores; dentro de las funciones se puede usar cualquier cosa. `inicio.js` va el último.

| Archivo | Qué hace |
|---|---|
| `datos.js` | `$`, `$$`, `esc`, límites (`MIN`/`MAX` 30–300, `NAME_MAX` 40, `ITEMS_MAX` 60, `LISTS_MAX` 100, `IMPORT_MAX` 30, `TEXT_MAX`, `LINK_WARN`), `tempoMark`, estado `st` y su validación (`cleanState`, `cleanList`, `cleanItems`, `cleanName`), `load`/`save` (`localStorage`, clave `multimetronomo-v1`), `P()` (temas de la lista actual), `ui` (estado de pantalla no guardado), `say` (lector de pantalla) y `toast`. |
| `audio.js` | `ensureAudio` (con `navigator.audioSession.type='playback'` para iOS), `click(t)`, planificador con margen (`sched` cada 25 ms programa lo que cae en 120 ms; tras una pausa del hilo salta lo atrasado), cola `queue` de pulsos `{t, n, d}`, `heard()` (hora que se oye, con `getOutputTimestamp`), `start`/`stop`/`toggle`, Wake Lock y reanudar al volver a la app. |
| `pulso.js` | `draw()` en cada fotograma: la pelota va de la luz izquierda (pulsos pares) a la derecha (impares) a velocidad constante; la luz del lado al que llega queda encendida el primer 35 % del pulso. `markStuck` (sombra del indicador fijo). Iconos `ICON`, `paintSound`, `paintPlay`, `toggleSound`. |
| `tempo.js` | `setBpm(b, from)` (actualiza número, deslizante y término; si no viene de un tema y no coincide, pasa a tempo libre `st.idx=-1`), − / + y ±5 con repetición al mantener, número, tap tempo (`tapAt`: media de los últimos 8, reinicio tras 2 s) y deslizante. |
| `temas.js` | `choose`, `go(d)` (con vuelta; desde tempo libre, al más cercano en ese sentido), `paintCur` (barra de abajo), `paintPresets` (grilla), `setEditing`, `presetSheet(i)` (guardar con nombre / editar / mover / borrar), `closeSheets`. |
| `listas.js` | `folders()`, `listTitle`, `paintLists` (desplegable propio con carpetas; `st.closed` guarda las cerradas), `pickList`, `setDd`, `bindLists` (delegación, flechas, Esc, tocar fuera), `listSheet(i)` (nombre y carpeta con `<datalist>`). |
| `compartir.js` | `toText`, `parseText` (tolerante), `b64e`/`b64d`, `linkFor`, `fromLink`, `copy`, `shareSheet`, `importSheet(pre)` (vista previa; añade sin pisar: «Nombre (2)»), `openSharedFromHash` (al cargar y en `hashchange`; `clearShareHash` lo quita de la dirección). |
| `guia.js` | Guía de bienvenida en `<dialog>` modal: `GUIDE` (7 pasos), `openGuide`, `closeGuide`, `markSeen` (`st.seen`), Anterior/Siguiente, flechas y deslizar el dedo. Enlaza la ayuda en PDF. |
| `inicio.js` | Conecta los controles, atajos de teclado (Espacio, ← →), arranque (`paintLists`, `setBpm`…), abre un enlace compartido o la guía la primera vez, y registra `sw.js`. |

Otros: `styles.css` (tokens de color con modo oscuro por `prefers-color-scheme` y `[data-theme]`, `@font-face` locales), `manifest.webmanifest`, `sw.js` (red primero y caché sin conexión; **subir `VERSION` al publicar** y añadir a `FILES` cualquier archivo nuevo: `tests/movil.test.js` lo comprueba), `icons/` (generados del logo; `logo.png` es una máscara blanca que CSS pinta con `--ink`), `ayuda/ayuda.html` → `ayuda/Multimetronomo-ayuda.pdf`, `tools/ayuda.js` (capturas de `docs/capturas/` y el PDF).

## Decisiones

- **Pulso:** dos luces, una a cada lado; sin compás ni acento (todos los clics iguales). Rebote lineal.
- **Tempo:** 30–300 ppm. − / + de 1 (mantenidos aceleran y acaban de 5 en 5), ±5 de 5. Cambiar el tempo con el metrónomo en marcha se oye desde el pulso siguiente.
- **Deslizante:** `#slider` tiene `pointer-events:none`; encima, `#sliderHit` (`touch-action: pan-y`) solo cambia el tempo con un arrastre horizontal de más de 10 px (si antes hay 8 px en vertical, es un desplazamiento y se ignora), relativo al valor que tenía. El teclado usa el `<input type=range>`.
- **Fijo en pantalla:** el pulso (`position: sticky` dentro de la tarjeta) y la barra ‹ tema › (fija abajo). `html{scroll-padding}` evita que tapen el foco.
- **Temas y listas:** cada lista `{n, f, p:[{n, b}]}` (`f` = carpeta, '' = sin carpeta). Una carpeta existe mientras tenga alguna lista. «Siguiente» después del último vuelve al primero. Borrar (tema o lista) pide un segundo toque. No se puede borrar la última lista.
- **Datos no fiables:** todo lo que viene de `localStorage`, de un texto importado o de un enlace pasa por `cleanState`/`parseText` (tipo, rango y largo) y se escapa con `esc()` al ir a `innerHTML`. Nunca se usa una clave externa para indexar objetos.
- **CSP** (`<meta>` en `index.html`): sin scripts ni estilos en línea ni atributos `style=""` (por JS, `el.style.x = …` sí vale), sin recursos externos. `tests/*` comprueban que no hay violaciones ni peticiones externas.
- **Accesibilidad:** objetivos de 44 px, nombres accesibles en botones de solo icono, `aria-pressed`/`aria-expanded`/`aria-current`, `say()` anuncia cambios, foco gestionado al abrir y cerrar hojas y la guía, `prefers-reduced-motion` y `forced-colors`.

## Pruebas

`npm test` (= `node tests/run.js [filtro]`): `tempo`, `pulso`, `temas`, `listas`, `compartir` (incluye datos hostiles y dañados), `guia` y `movil` (anchos de 320 a 430 px, 44 px, modo oscuro, manifiesto, service worker y uso sin conexión). `tests/lib.js` sirve el repositorio por HTTP en 127.0.0.1 y anota errores, violaciones de CSP y peticiones externas. Si cambia la interfaz, rehacer capturas y PDF con `npm run ayuda`.
