# EV Sound Studio

PWA para el navegador de la cabina de un vehículo eléctrico: **sonido de motor dinámico** según la velocidad (Modo Conducción) y **paisajes sonoros** con el auto detenido (Listen). Proyecto independiente, no afiliado a Tesla, Inc. ni a iCAR/Chery.

> Reglas que no cambian: audio **solo en cabina**, la app **no controla ni lee** el vehículo (todo ajuste es de sonido), la telemetría **nunca sale del dispositivo**, sin logos de marcas. Detalle en [`CLAUDE.md`](CLAUDE.md) y [`docs/SPEC.md`](docs/SPEC.md).

## Puesta en marcha

```bash
npm install
npx playwright install chromium   # solo para e2e / capturas
npm run dev                        # http://localhost:5173
npm run check                      # tsc + eslint + vitest (todo en verde antes de commitear)
npm run e2e                        # Playwright: proyectos "car" (1920×1200 táctil) y "small" (1280×720)
npm run build && npm run preview   # build de producción (con Service Worker)
npm run lighthouse                 # Lighthouse desktop sobre el build (umbral de performance 85)
```

Scripts de generación (los assets se producen por código, ver `ASSETS_LICENSES.md`):

| Script | Genera |
|---|---|
| `npm run traces` | trazas sintéticas de velocidad en `public/traces/` (urbana, autopista, 0–100) |
| `npm run ambient` | pistas WAV y `catalog.json` / `packs.json` en `public/sounds/` |
| `npm run icons` | iconos PWA en `public/icons/` (renderizados con Chromium) |
| `npm run shots` | capturas de las pantallas en `docs/screenshots/` |

## Arquitectura

```
Telemetría                         Audio                              UI
GeolocationSource ─┐               AudioEngine (singleton)            React + Zustand
SimulatedSource ───┼─► Kalman ─►   Gearbox ► EngineModel ► Voice      Vehicle · Listen · Dynamics
TraceReplaySource ─┘   (60 Hz)     SynthVoice / EngineVoice            DriveModeOverlay (v>8 km/h)
  telemetryStore ───────────────►  EngineDriver (setTargetAtTime)      Diagnóstico oculto (5 toques en la hora)
                                   AmbientPlayer ► Media Session
```

- **Lógica pura** (sin DOM ni Web Audio, con tests): `Gearbox`, `EngineModel`, `KalmanEstimator`, `GpsProcessor`, `haversine`, `DriveModeDetector`, `playerQueue`, `packManager`.
- **Estado**: `src/state/*Store.ts` (telemetry, settings, vehicle, session, player, audio, drive, pwa, toast). `localStorage` siempre vía `safeStorage` (try/catch).
- **Audio**: el `AudioContext` se crea solo tras un gesto (`AudioEngine.unlock()`); cadena `bus → master → limitador → analyser → salida`. El volumen de salida es `volumen × maxVolume (0.6)` y pasa por un compresor/limitador: **la app no puede ser más fuerte que ese tope** y no pretende enmascarar las alertas del vehículo.
- **PWA**: `src/pwa/sw.ts` (Workbox `injectManifest`): precache del shell; `/sounds` y `/models` en `CacheFirst` con *range requests* (cachés versionadas en `cacheNames.ts`); JSON pequeño en *stale-while-revalidate*. Los paquetes de sonido se descargan de forma explícita (`packManager`, panel "Sonidos descargados" en Dinámica).
- **Rutas** (HashRouter): `/vehicle`, `/listen`, `/listen/:id`, `/dynamics`; de desarrollo: `/dev/telemetry`, `/dev/audio`, `/dev/ui`.

Sprint 0 (prueba física): `public/diagnostics/index.html` — página autónoma para llevar al auto (`/diagnostics/index.html`). Guía en [`docs/field-test-checklist.md`](docs/field-test-checklist.md).

## Cómo agregar un vehículo

1. Crea `src/vehicles/catalog/<id>.json` con el esquema de `VehicleProfile` (`src/vehicles/types.ts`): `displayName`, `variant`, `maker` (texto, **sin logo**), `body` (`suv` | `sedan` | `offroad`), `specs`, `model3d`, `calibration` y `"verified": false` hasta contrastar con la ficha oficial.
2. Regístralo en `src/vehicles/catalog.ts`.
3. (Opcional) Pon un `.glb` con licencia comercial en `public/models/<id>.glb` y regístralo en `ASSETS_LICENSES.md`. Sin `.glb`, se usa el modelo procedural según `body`. Si el `.glb` falla al cargar, cae al procedural.
4. Un nuevo tipo de carrocería se define en `src/vehicles/bodyShapes.ts` (perfiles laterales).

## Cómo agregar un perfil de sonido

1. Define un `SoundProfile` en `src/audio/profiles/index.ts` (`gears`, `idleRpm`, `redlineRpm`, `shiftUpRpm`, `shiftDownRpm`, `cylinders`, `synth` y `fx`) y agrégalo a `soundProfiles`.
2. **Sintetizado** (`kind: 'synth'`): ajusta `synth.oscillators` y `noise`; no requiere archivos.
3. **Con samples** (`kind: 'sampled'`): crea `public/sounds/<id>/manifest.json` con `{ "layers": [{ "rpm": 1000, "onLoad": "1000-on.ogg", "offLoad": "1000-off.ogg" }, …] }` (≤ 8 MB por perfil, OGG/Opus 96–128 kbps), regístralos en `ASSETS_LICENSES.md` y añade el paquete a `public/sounds/packs.json`. Si el manifiesto falta o falla, se usa `SynthVoice` como respaldo.
4. Agrega un test de `Gearbox`/`EngineModel` si el perfil tiene reglas propias (el *soak test* `engineSoak.test.ts` ya recorre todos los perfiles).

## Lo que no se puede verificar desde el repositorio

Ver [`docs/REVISION_FASE8.md`](docs/REVISION_FASE8.md): validación en el vehículo real (Sprint 0 / Fase 7), escucha subjetiva, rendimiento en MCU2/MCU3, modelos 3D finales, y contraste de las especificaciones con las fichas oficiales.

## Imágenes de vehículos (no incluidas en el repositorio)

Los renders X-Ray de la pantalla Vehículo (`public/images/vehicles/<id>.png`, con `<id>` = `tesla-model-y`, `tesla-model-3`, `icar-03`) y sus fuentes pesadas (`docs/cars/`) están en `.gitignore` por tamaño y por derechos de autor. Sin ellos la app sigue funcionando: la pantalla Vehículo muestra la escena 3D procedural. Para verlos, copia tus PNG con esos nombres a `public/images/vehicles/`. Los tests e2e de esa pantalla esperan los renders presentes.
