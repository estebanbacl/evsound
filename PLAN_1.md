# Plan de Ejecución en Claude Code — EV Sound Studio

> Úsalo junto con `SPEC.md` y `CLAUDE.md` en la raíz del repo.
> Cada fase trae: objetivo, prompt listo para pegar en Claude Code, entregables, criterios de aceptación y verificación.
> Regla de oro: **una fase por sesión**, terminar con `npm run check` en verde y un commit.

---

## Cómo usar este plan

1. Crea un repo vacío y copia `SPEC.md`, `PLAN.md` y `CLAUDE.md` a la raíz.
2. Abre Claude Code en esa carpeta.
3. Para cada fase: entra en *plan mode* (Shift+Tab dos veces), pega el prompt de la fase, revisa el plan que propone, apruébalo y deja que ejecute.
4. Al cerrar la fase, pide: *"Actualiza la sección Progreso de PLAN.md y haz commit con mensaje convencional."*

Script `check` esperado (se crea en la Fase 0): `npm run check` = `tsc --noEmit && eslint . && vitest run`.

---

## Sprint 0 — Validación física en el vehículo (ANTES de la Fase 2)

**Objetivo:** confirmar las suposiciones que pueden invalidar el producto (RFC §5, SPEC R2/R3).

### Prompt
```
Lee SPEC.md (sección 0 y 11). Crea una página de diagnóstico autónoma en /diagnostics
(un solo archivo HTML+JS sin dependencias, en public/diagnostics/index.html) que:
1. Muestre user agent, versión de Chromium, resolución y devicePixelRatio.
2. Tenga un botón "Iniciar audio" que cree un AudioContext y reproduzca un tono de 220 Hz
   con un oscilador; muestre en vivo audioContext.state, baseLatency y outputLatency.
3. Inicie geolocation.watchPosition(enableHighAccuracy) y muestre por cada muestra:
   timestamp, coords.speed, accuracy, intervalo desde la anterior; y la frecuencia media.
4. Registre eventos visibilitychange, pagehide, freeze/resume y cambios de AudioContext.state.
5. Detecte soporte de: DeviceMotionEvent, Service Worker, Cache Storage,
   navigator.storage.estimate, Media Session, Wake Lock, WebGL2.
6. Permita "Exportar log" como JSON descargable y también lo muestre en un <pre> copiable.
Debe ser legible a 1920x1200 con fuente grande. Despliégala en Vercel como preview.
```

### Protocolo de prueba en el auto (manual)
| Prueba | Pasos | Registrar |
|---|---|---|
| P1 Audio en Park | Abrir, iniciar audio | ¿Suena? latencias |
| P2 Paso a Drive | Con tono sonando, pasar a D | ¿Sigue sonando? ¿navegador se cierra/bloquea? |
| P3 Conducción 5 min | Ciudad | Frecuencia GPS, `coords.speed` nulo o no |
| P4 Pantalla dividida | Abrir navegación nativa | ¿GPS se congela? ¿audio sigue? |
| P5 Música nativa | Reproducir radio/Spotify del auto | ¿Se mezclan o uno silencia al otro? |
| P6 Offline | Modo avión/sin datos tras cargar | ¿Service Worker sirve la página? |

**Gate:** si P2 falla (audio muere en Drive), el Modo Conducción pasa a "experimental" y se prioriza Modo Estático + Simulador. Documentar resultados en `docs/field-tests/2026-xx-xx.md`.

---

## Fase 0 — Scaffolding y tooling

### Prompt
```
Lee CLAUDE.md y SPEC.md §5. Inicializa el proyecto:
- Vite + React 19 + TypeScript strict, React Router (HashRouter), Zustand.
- ESLint (flat config) + Prettier, Vitest + Testing Library, Playwright con un proyecto
  "car" (Chromium, viewport 1920x1200, hasTouch) y otro "small" (1280x720).
- Scripts: dev, build, preview, test, e2e, check (tsc --noEmit && eslint . && vitest run).
- Crea la estructura de carpetas exacta de SPEC.md §5 con archivos index vacíos tipados.
- Crea src/ui/tokens.css con los tokens de SPEC.md §8 (colores, tipografías, radios, glow,
  espaciados) y un tema oscuro único.
- Un AppShell mínimo con StatusBar arriba y BottomNav (Vehicle, Listen, Dynamics) que navega
  entre tres pantallas placeholder.
- Un e2e de humo que navega por las tres pestañas.
- Archivo ASSETS_LICENSES.md vacío con tabla (asset, fuente, licencia, fecha).
Termina con npm run check y npm run e2e en verde.
```

**Aceptación:** build sin warnings, e2e de humo pasa, tokens aplicados.

---

## Fase 1 — Telemetría y simulador (sin audio todavía)

### Prompt
```
Implementa src/telemetry según SPEC.md RF-3 y §7.1:
- Interfaz SpeedSource con start/stop y callback de TelemetrySample.
- GeolocationSource (coords.speed primario, haversine fallback, rechazo de outliers,
  detección de stale >3 s con velocidad previa > 2 m/s, lost por error).
- SimulatedSource: acelerador virtual 0..1 y freno, con física simple (masa, drag,
  aceleración máxima tomada de VehicleProfile.specs.zeroTo100s).
- TraceReplaySource: reproduce JSON [{t, speedMs}] a 1 Hz con velocidad x1/x2/x4.
- KalmanEstimator (estado [v, a]) con tests unitarios: escalón, rampa, ruido, huecos.
- Bucle a 60 Hz (rAF) que publica v̂ y â en un store Zustand `telemetryStore`.
- Grabador opt-in que exporta la sesión a JSON.
- Genera 3 trazas sintéticas en public/traces: urbano (paradas y arranques), autopista,
  arranque fuerte 0-100.
- Pantalla temporal /dev/telemetry con gráfica (canvas) de muestras crudas vs. estimación.
Cobertura de tests de telemetry ≥ 85 %.
```

**Aceptación:** con la traza urbana, la curva estimada es continua, sin escalones visibles a 1 Hz, y llega a 0 en paradas sin valores negativos.

---

## Fase 2 — Motor de audio dinámico

### Prompt
```
Implementa src/audio según SPEC.md RF-2, §6 y §7.2–7.3:
- AudioEngine singleton: AudioContext creado solo tras gesto del usuario, master gain,
  compresor/limitador final, límite de volumen máximo configurable, reanudación automática
  tras suspensión (escuchar statechange y visibilitychange) y evento "needsGesture".
- Gearbox puro (sin Web Audio) con histéresis y retraso de cambio por carga; tests unitarios.
- SynthVoice: motor 100 % sintetizado (osciladores armónicos de la frecuencia de encendido
  según RPM y cilindros + ruido filtrado) — debe sonar bien sin ningún sample.
- EngineVoice: capas de loops por RPM con crossfade de igual potencia y playbackRate,
  on-load/off-load; carga los samples desde public/sounds/<perfil>/manifest.json.
- Perfiles v1 en src/audio/profiles: v8-americano, turbo-4, nave-espacial (synth), turbina (synth).
  Mientras no haya samples con licencia, v8 y turbo-4 usan SynthVoice con su propia config.
- Conexión: suscribirse a telemetryStore y actualizar AudioParams con setTargetAtTime.
- Pantalla /dev/audio con acelerador virtual (SimulatedSource), RPM, marcha y carga en vivo.
Mide y registra en consola la latencia entre actualización de telemetría y AudioParam.
```

**Aceptación:** en /dev/audio, acelerar a fondo produce subida de RPM, cambios de marcha audibles y creíbles; soltar produce caída suave; 10 min de traza sin glitches (verificar en `chrome://media-internals` o métricas propias).

---

## Fase 3 — Sistema de diseño y shell final

### Prompt
```
Construye la identidad visual propia de SPEC.md §8 (no copiar las imágenes de referencia):
- Componentes en src/ui/components: Panel (borde rojo, glow), SegmentedControl,
  Slider, IconButton, Gauge circular (RPM), BigNumber (velocidad), MiniPlayer, Toast.
- Fondo: cuadrícula punteada en perspectiva + estelas de viento en un canvas/shader ligero,
  con prop `paused`.
- StatusBar: P/D inferido, estado GPS (good/stale/lost), estado de audio, hora.
- BottomNav: velocidad grande a la izquierda con flechas, Vehicle·Listen·Dynamics al centro,
  volumen a la derecha. Objetivos táctiles ≥ 48 px.
- Página /dev/ui (catálogo de componentes) y tests de render.
- Fuentes vía Google Fonts con font-display: swap y fallback del sistema.
Valida visualmente a 1920x1200 y 1280x720 con screenshots de Playwright guardados en
docs/screenshots/.
```

---

## Fase 4 — Selección de vehículo y render 3D

### Prompt
```
Implementa src/vehicles y la pantalla Vehicle según SPEC.md RF-1, RF-5.2 y §6:
- Catálogo JSON para model-y-juniper-dm, model-3-highland-dm, icar-03-4x4 con las specs de
  SPEC.md §6 (marcar con un campo "verified": false).
- detectVehicle(userAgent) que solo sugiere; vehicleStore persistido con try/catch.
- Onboarding de primer uso: advertencia de seguridad + carrusel de selección de vehículo.
- VehicleModel con @react-three/fiber: carga .glb por vehículo; si no hay glb, genera un
  "vehículo procedural" estilizado (silueta SUV vs. sedán vs. todoterreno cuadrado) en
  wireframe rojo con batería y motores internos en ámbar. Sin logos ni wordmarks.
- Material rayos X: aristas (EdgesGeometry) + superficies translúcidas con fresnel.
- Rotación lenta, órbita táctil limitada, tocar batería/motor muestra la spec.
- Niveles de calidad (alto/medio/bajo) según GPU detectada y fps medidos; render pausado
  cuando DriveMode está activo o la pestaña no es visible.
- Panel derecho de especificaciones y descargo de no afiliación.
Documenta en ASSETS_LICENSES.md cualquier modelo 3D usado.
```

**Aceptación:** cambiar de vehículo actualiza modelo, specs y calibración del motor de sonido; ≥ 30 fps en desktop medio con calidad alta.

---

## Fase 5 — Dynamics y Modo Conducción

### Prompt
```
Implementa la pantalla Dynamics y DriveModeOverlay (SPEC.md RF-5.3, RF-5.4, RF-2.8):
- Selector de perfil de sonido con previsualización (2 s de "revoluciones" en Park).
- Presets de sonido Confort/Balanceado/Deportivo/Custom (afectan intensidad, carácter,
  puntos de cambio). Dejar explícito en la UI que son ajustes de sonido.
- Sliders: volumen, intensidad, carácter. Botón grande Arrancar/Detener motor.
- Tacómetro circular propio + velocidad + marcha virtual + forma de onda en vivo (AnalyserNode).
- Toggle de fuente: GPS / Simulador / Traza.
- DriveMode: se activa con v > 8 km/h sostenido 3 s y se desactiva con v < 3 km/h por 5 s.
  Overlay con solo: RPM grande, perfil, volumen ±, Detener. Objetivos ≥ 64 px, sin scroll.
  Pausa el fondo animado y el 3D.
- e2e: con TraceReplaySource (autopista) DriveMode aparece y desaparece en los tiempos esperados.
```

---

## Fase 6 — Listen (Modo Estático)

### Prompt
```
Implementa Listen según SPEC.md RF-4:
- AmbientPlayer en src/audio (independiente del motor; si el motor está activo, pausar
  ambiente o mezclar con ducking — configurable).
- Manifiesto de colecciones en public/sounds/ambient/catalog.json. Genera 2 colecciones de
  ejemplo con pistas sintetizadas offline (script Node que renderiza WAV/OGG con
  OfflineAudioContext o similar) para no depender de audio con copyright. Portadas generadas
  por código (SVG/canvas) con estética propia.
- Pantallas: Listen home (Último escuchado, Reproducido recientemente, Para ti) y detalle de
  colección con lista de pistas, pista activa resaltada, play grande.
- MiniPlayer global en la barra inferior con shuffle, prev, play/pause, next, repeat y progreso.
- Media Session API con metadatos y handlers.
```

---

## Fase 7 — PWA, offline y paquetes de sonido

### Prompt
```
Implementa SPEC.md RF-6 con vite-plugin-pwa:
- Precache del shell; runtime cache CacheFirst para /sounds y /models con versionado.
- packManager: descargar/eliminar paquetes por perfil con progreso, tamaño y
  navigator.storage.estimate; UI en Dynamics > "Sonidos descargados".
- Página offline y aviso de actualización disponible (prompt para recargar).
- Test e2e: cargar app, descargar un perfil, poner el contexto offline en Playwright y
  verificar que la app y ese perfil funcionan.
- Lighthouse CI en desktop: PWA instalable, Performance ≥ 85.
```

---

## Fase 8 — Endurecimiento, prueba de campo y despliegue

### Prompt
```
- Revisa todo el código contra SPEC.md §4 y §10; lista brechas y corrígelas.
- Agrega un panel oculto de diagnóstico (5 toques en la hora) con métricas: frecuencia GPS,
  calidad, latencia audio, fps, estado del AudioContext, versión.
- Manejo de errores global (ErrorBoundary + toasts), logs exportables.
- Configura despliegue en Vercel (vercel.json con headers de caché correctos para /sounds y
  /models, y Cache-Control no-cache para sw.js).
- Escribe docs/field-test-checklist.md para la prueba en vehículo con los 3 modelos.
- Escribe README.md con setup, arquitectura y cómo agregar un vehículo o un perfil de sonido.
```

**Aceptación final:** criterios globales de `SPEC.md §10` cumplidos y reporte de campo adjunto.

---

## Orden y dependencias

```
Sprint 0 (campo) ──► gate
Fase 0 ─► Fase 1 ─► Fase 2 ─┬─► Fase 5 ─┐
          Fase 3 ───────────┤           ├─► Fase 7 ─► Fase 8
                    Fase 4 ─┘  Fase 6 ──┘
```
Fases 3 y 4 pueden correr en paralelo a 1–2 (p. ej. en otra worktree de Claude Code).

## Progreso
| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| Sprint 0 | ☐ | | |
| 0 | ☐ | | |
| 1 | ☐ | | |
| 2 | ☐ | | |
| 3 | ☐ | | |
| 4 | ☐ | | |
| 5 | ☐ | | |
| 6 | ☐ | | |
| 7 | ☐ | | |
| 8 | ☐ | | |
