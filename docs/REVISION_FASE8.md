# Revisión de la Fase 8 contra SPEC §3, §4 y §10

Fecha: 2026-10-23 · Versión 1.0.0 · Estado: **código completo; faltan las pruebas que solo se pueden hacer en el vehículo**.

Leyenda: ✅ verificado con prueba automática · 🟡 implementado, verificación parcial · ⛔ no hecho / depende de terceros o del vehículo.

## Resultado de la suite

| Comprobación | Resultado |
|---|---|
| `npm run check` (tsc estricto + eslint + vitest) | 29 archivos, 192 tests en verde |
| `npm run e2e` (Chromium, `car` 1920×1200 táctil y `small` 1280×720) | 48 pruebas en verde (8 capturas opcionales con `npm run shots`) |
| Lighthouse desktop sobre el build (`npm run lighthouse`) | Performance 100 · Accesibilidad 100 · Buenas prácticas 100 |
| Instalable | ✅ `Page.getInstallabilityErrors` vacío (la categoría PWA ya no existe en Lighthouse ≥ 12) |

## Requisitos funcionales (§3)

| RF | Estado | Evidencia / brecha |
|---|---|---|
| RF-1.1–1.5 Selección de vehículo | ✅ | Onboarding con carrusel (silueta 2D), `detectVehicle` solo sugiere, persistencia con `safeStorage`, 3 vehículos en JSON. `e2e/vehicle.spec.ts` |
| RF-2.1 Perfiles V8 / Turbo 4 / Nave / Turbina | 🟡 | Los 4 existen, pero **todos sintetizados**: V8 y Turbo 4 son aproximaciones sin samples reales (no hay samples con licencia). `EngineVoice` (capas) está implementado y probado solo en su matemática (`mix.test.ts`), no con audio real |
| RF-2.2–2.7 Pipeline, carga, cambios, ralentí, fallback | ✅ | `Gearbox`, `EngineModel`, `SynthVoice`; tests + soak de 10 min lógicos por perfil (`engineSoak.test.ts`) |
| RF-2.8 Volumen, intensidad, carácter | ✅ | Sliders + presets de sonido; `e2e/dynamics.spec.ts` |
| RF-3.1–3.4 GPS, Haversine, Kalman, señal congelada | ✅ | `GpsProcessor`, `KalmanEstimator` (≥ 90 % cobertura). Estado `stale/lost` visible en la barra y `lost` → ralentí |
| RF-3.5 DeviceMotion | ⛔ (opcional) | Solo *feature detection* (panel de diagnóstico). La fusión no se implementó: la spec la marca como opcional y R4 dice que probablemente no existe en el auto |
| RF-3.6 Simulador y trazas | ✅ | `SimulatedSource`, `TraceReplaySource`, 3 trazas |
| RF-3.7 Grabación opt-in | ✅ | Botón en Dinámica y en `/dev/telemetry`; solo se guarda en memoria hasta exportar el JSON |
| RF-4.1–4.4 Listen | ✅ | 2 colecciones sintetizadas, home + detalle, mini-player global, Media Session. Reproducción real verificada en e2e |
| RF-5.1–5.5 Interfaz | ✅ | Barra inferior, Vehículo (3D + specs), Dinámica, Modo Conducción, barra de estado |
| RF-6.1–6.3 PWA | ✅ | `e2e/pwa.spec.ts`: descarga un paquete, offline, la app y la pista funcionan |

## Requisitos no funcionales (§4)

| RNF | Estado | Evidencia / brecha |
|---|---|---|
| RNF-1 Latencia < 50 ms | 🟡 | Se mide telemetría → `AudioParam` (panel oculto y consola); la latencia de **salida del auto** (`outputLatency`) solo se conoce en el vehículo |
| RNF-2 0 glitches en 30 min | 🟡 | Soak lógico de 10 min × 4 perfiles (parámetros finitos, acotados, sin *gear hunting*, rpm suaves). **No** mide glitches audibles reales |
| RNF-3 ≥ 30 fps en MCU3; 3D pausado al conducir | 🟡 | 3D se pausa en Modo Conducción y con pestaña oculta (e2e). Calidad automática por fps. **fps en MCU2/MCU3 sin medir** |
| RNF-4 Shell < 300 KB gz, TTI < 3 s | ✅ | Shell ≈ 118 KB gz (JS 110 + CSS 4 + otros); Three.js va en un chunk perezoso (258 KB gz). Lighthouse TTI ≈ 1 s |
| RNF-5 Paquetes ≤ 8 MB | ✅ | 3,6 MB por colección (test). **Formato WAV 16 kHz mono**, no OGG/Opus: no hay codificador en el entorno; si se grabaran samples reales deben ir en OGG/Opus |
| RNF-6 Táctil ≥ 48 px (≥ 64 en conducción), contraste AA | ✅ | e2e mide cada botón/enlace en 4 pantallas; Modo Conducción ≥ 64 px; contraste con test de tokens + axe. **Desviación de SPEC §8**: `#8A2B2B` da 2,4:1, por lo que el texto secundario usa `#C97070` y `#8A2B2B` queda solo para trazos |
| RNF-7 1920×1200 → 1280×720 | ✅ | Proyectos `car` y `small`; capturas en `docs/screenshots/` |
| RNF-8 Privacidad | ✅ | `e2e/privacy.spec.ts`: ninguna petición contiene la posición; solo se contacta a `fonts.googleapis.com`/`fonts.gstatic.com` (IP y UA, nunca ubicación). Alternativa si se quiere eliminar incluso eso: alojar las fuentes localmente |
| RNF-9 Compatibilidad | ⛔ | La versión de Chromium del auto es una incógnita (Sprint 0). El build usa el objetivo por defecto de Vite 8; si el auto tiene un Chromium viejo habrá que bajar `build.target` |

## Criterios de aceptación globales (§10)

| # | Criterio | Estado |
|---|---|---|
| 1 | Selección de vehículo funcional y persistente (3 modelos) | ✅ |
| 2 | Traza de 10 min con cambios de marcha creíbles y sin glitches | 🟡 Lógica verificada; **falta escucharlo** en cabina |
| 3 | Modo Conducción se activa/desactiva solo, UI reducida | ✅ (tiempos exactos 3 s / 5 s con reloj simulado) |
| 4 | Listen con controles completos y Media Session | ✅ (Media Session probado con mock; el comportamiento en el auto es desconocido) |
| 5 | Funciona offline tras la primera carga y descarga de un perfil | ✅ |
| 6 | Lighthouse PWA instalable y Performance ≥ 85 | ✅ |
| 7 | Informe de prueba física (Sprint 0 + Fase 7) | ⛔ Requiere el vehículo: `public/diagnostics/index.html` y `docs/field-test-checklist.md` están listos |

## Brechas encontradas y corregidas en esta fase

1. **Contraste**: el texto secundario de la spec no cumplía AA → tokens `--accent-dim` / `--line-dim` y test de contraste.
2. **Salto de rpm al arrancar** (≈ 400 rpm en un frame al pasar de ralentí a 1ª): el soak lo detectó → `Gearbox` continuo.
3. **Escalón de rpm a 1 Hz** (hasta 550 rpm por frame): el suavizado de salida vivía solo en `TelemetryEngine` → extraído a `OutputSmoother` y compartido por el soak test.
4. **Sprint 0 sin página de diagnóstico**: no existía → `public/diagnostics/index.html` (+ e2e).
5. **Grabación de trazas solo en `/dev`** → botón en Dinámica.
6. Manejo global de errores, panel de diagnóstico oculto (5 toques en la hora) y logs exportables.

## Pendientes que dependen de ti o del vehículo

- **Prueba en el auto** de los 3 modelos (Sprint 0 y Fase 7) y el gate de P2 (¿suena en Drive?).
- **Despliegue en Vercel**: `vercel.json` está listo (caché de `/sounds`, `/models`, `no-cache` para `sw.js`), pero no se desplegó (requiere tu cuenta).
- **Modelos 3D `.glb` con licencia** para reemplazar el casco procedural, y **samples de motor** con licencia si se quiere sonido más realista que la síntesis.
- **Verificar las especificaciones** contra las fichas oficiales (todos los vehículos están con `"verified": false`).
- **Escucha subjetiva** de los perfiles y de las pistas ambientales (generadas por código; solo se verificó nivel, no ausencia de fatiga auditiva).
- Probar `Media Session` y `Wake Lock` en el navegador del auto.
