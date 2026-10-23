# Especificación de Software — EV Sound Studio (nombre provisional)

> Versión 1.0 · 23 oct 2026 · Basada en el RFC "Plataforma Web de Efectos de Sonido para Vehículos Eléctricos"
> Estado: lista para ejecución por fases en Claude Code (ver `PLAN.md`)

---

## 0. Revisión del RFC — ajustes incorporados a esta especificación

| # | Punto del RFC | Hallazgo | Decisión en esta spec |
|---|---|---|---|
| R1 | Audio a altavoces externos (PWS) en modo estático | Una web no puede rutear audio al altavoz exterior; eso solo lo hace el firmware del fabricante (ej. Boombox vía USB). Además el sonido exterior de EVs está regulado (FMVSS 141 en EE.UU., UN R138 en Europa/LatAm). | **Fuera de alcance.** Todo el audio sale por los parlantes de cabina. Se documenta como "no soportado". |
| R2 | Navegador activo en Drive | Depende del mercado: hay países donde el navegador queda bloqueado con el auto en marcha (ej. Australia) y otros donde funciona. Pantalla completa se desactiva en marcha. | Sprint 0 obligatorio de validación física en Colombia. La app debe degradar con gracia si el audio se suspende (detectar `AudioContext.state === 'suspended'` / `visibilitychange`). |
| R3 | Geolocation a 1 Hz | El navegador de Tesla sí expone `watchPosition()` y `coords.speed`. Hay reportes de posición congelada cuando la navegación nativa está activa. | Usar `coords.speed` como fuente primaria, derivar desde coordenadas solo como fallback, y filtro de Kalman + extrapolación a 60 Hz. Detectar "señal congelada" (>3 s sin cambios en marcha). |
| R4 | DeviceMotion / acelerómetros | El navegador del auto no es un dispositivo móvil; es muy poco probable que exponga sensores. | Se mantiene como *feature detection* opcional, nunca como dependencia. |
| R5 | Pitch proporcional a la velocidad | Un pitch lineal con la velocidad suena artificial (como una sirena). Un motor real sube y baja RPM con los cambios. | **Caja de cambios virtual**: velocidad → RPM según relaciones de marcha por perfil; el pitch sigue las RPM y la carga (aceleración) controla volumen/timbre. |
| R6 | Next.js + Vercel | No se necesita SSR; todo es cliente y offline. | **Vite + React + TypeScript** (SPA estática), desplegable en Vercel igual. Menos complejidad para PWA. |
| R7 | Modelos Tesla Model Y / Model 3 / iCAR 03 y estética tipo "pantalla del auto" | (a) Logos y wordmarks (TESLA, iCAR) son marcas registradas. (b) Modelos 3D de autos reales requieren licencia. (c) Los mockups muestran controles que una web **no puede** ejecutar (aceleración, suspensión, Sentry, puerto de carga) y que imitan el sistema del fabricante — confuso y potencialmente engañoso para el conductor. | Nombres de modelo como texto (uso nominativo), **sin logos**. Modelos 3D propios estilizados (wireframe/rayos X) o glTF con licencia comercial. Los controles de la UI son **solo de sonido** ("Sound Dynamics"), nunca simulan control del vehículo. Agregar descargo visible: "No afiliado a Tesla ni a iCAR". |
| R8 | Sección "Listen" con álbumes (imágenes de referencia) | El RFC no define catálogo musical; distribuir música requiere licencias. | "Listen" = biblioteca de **paisajes sonoros y perfiles de motor** propios o CC0/licenciados. Sin streaming musical en v1. |
| R9 | Autoplay | Chromium exige un gesto del usuario para iniciar `AudioContext`. | Botón explícito "Arrancar motor" que desbloquea audio; reanudar tras cualquier suspensión con un toque. |
| R10 | Seguridad del conductor | No mencionado en el RFC. | Modo Conducción con UI reducida: sin listas, sin scroll, objetivos táctiles ≥ 64 px, nada que exija lectura prolongada. |
| R11 | Rendimiento 3D en el auto | MCU2 (Intel Atom) es muy limitado frente a MCU3 (AMD Ryzen). | Niveles de calidad automáticos; el 3D se pausa/simplifica en Modo Conducción para priorizar el hilo de audio. |

---

## 1. Visión y alcance

Web app (PWA) para el navegador integrado de vehículos eléctricos que:

1. **Simula sonido de motor** en tiempo real según la velocidad del vehículo (Modo Conducción).
2. **Reproduce paisajes sonoros** con el auto detenido o cargando (Modo Estático).
3. Permite **seleccionar el vehículo en uso** (Model Y, Model 3, iCAR 03 en v1; catálogo extensible) y ajusta visual, especificaciones y calibración de sonido a ese vehículo.

### Fuera de alcance v1
- Audio al exterior del vehículo.
- Control o lectura de sistemas del vehículo (puerto de carga, suspensión, etc.).
- Cuentas de usuario, backend propio, comunidad/subida de sonidos (queda preparado para v2).
- Integración con Tesla Fleet API (evaluar en v2 como fuente de velocidad alternativa).

---

## 2. Usuarios y escenarios

| Escenario | Estado del auto | Interacción |
|---|---|---|
| Configurar vehículo y perfil | Park | Completa (selección, ajustes, previsualización) |
| Escuchar paisajes sonoros esperando carga | Park / cargando | Completa |
| Conducir con sonido de motor | Drive | Mínima: arrancar/detener, volumen, cambiar perfil con un toque |
| Probar perfiles sin conducir | Park | Modo Simulador (acelerador virtual en pantalla) |

---

## 3. Requisitos funcionales

### RF-1 Selección de vehículo
- RF-1.1 En el primer uso se muestra un selector de vehículo (carrusel con render 3D/2D de cada modelo).
- RF-1.2 Sugerencia automática por *user agent* (si contiene indicios de Tesla) — siempre confirmable por el usuario; nunca bloquea.
- RF-1.3 La selección persiste en `localStorage` (envuelto en try/catch) y se puede cambiar desde la pestaña **Vehicle**.
- RF-1.4 Cada vehículo define: nombre, variante, especificaciones, modelo 3D, color de acento opcional, y calibración (`VehicleProfile`, ver §6).
- RF-1.5 Catálogo inicial: `model-y-juniper-dm`, `model-3-highland-dm`, `icar-03-4x4`. Agregar un vehículo = agregar un JSON + un asset 3D.

### RF-2 Motor de sonido dinámico (Modo Conducción)
- RF-2.1 Perfiles de sonido v1: **V8 Americano**, **Turbo 4 cilindros**, **Nave Espacial** (sintetizado), **Turbina** (sintetizado).
- RF-2.2 Pipeline: velocidad → caja de cambios virtual → RPM → mezcla de capas → efectos → salida.
- RF-2.3 Capas de motor: loops grabados a RPM fijas (p. ej. 1000/2500/4500/6500) con crossfade de igual potencia y `playbackRate = rpm / rpmDeCapa`.
- RF-2.4 "Carga" (load) estimada desde la aceleración: modula volumen, filtro low-pass y mezcla on-load/off-load.
- RF-2.5 Cambios de marcha simulados con caída de RPM, pequeño "dip" de volumen y opcionalmente un "pop".
- RF-2.6 Ralentí cuando velocidad < 3 km/h.
- RF-2.7 Fallback 100 % sintetizado (osciladores + ruido) para que el PoC funcione sin samples.
- RF-2.8 Volumen maestro, intensidad (0–100 %) y "carácter" (más grave/agudo) ajustables.

### RF-3 Telemetría
- RF-3.1 Fuente primaria: `navigator.geolocation.watchPosition` con `enableHighAccuracy: true`, usando `coords.speed`.
- RF-3.2 Fallback: velocidad derivada por Haversine entre muestras consecutivas.
- RF-3.3 Filtro de Kalman 1D (estado: velocidad, aceleración) + extrapolación a ~60 Hz con límite de 1.5 s; si no llegan muestras, decaer suave a la última velocidad conocida.
- RF-3.4 Detección de señal congelada / pérdida de GPS → indicador en UI y congelar RPM en ralentí suave.
- RF-3.5 `DeviceMotion` solo si está disponible (fusión opcional).
- RF-3.6 **Modo Simulador**: fuente de velocidad sintética (acelerador virtual) y **reproductor de trazas** (GPX/JSON grabadas) para desarrollo y demos.
- RF-3.7 Grabación de trazas reales (opt-in) exportables a JSON para calibración.

### RF-4 Modo Estático (Listen)
- RF-4.1 Biblioteca de paisajes sonoros (ambientes: "Órbita", "Lluvia en cabina", "Ciudad nocturna", etc.) con portadas propias.
- RF-4.2 Reproductor: play/pausa, siguiente/anterior, aleatorio, repetir, barra de progreso.
- RF-4.3 Pantallas: Inicio de Listen ("Último escuchado", "Reproducido recientemente", "Para ti") y detalle de colección con lista de pistas.
- RF-4.4 Media Session API para metadatos y controles del sistema donde estén soportados.

### RF-5 Interfaz
- RF-5.1 Barra inferior persistente: **Vehicle · Listen · Dynamics** (+ mini-reproductor y volumen).
- RF-5.2 **Vehicle**: render 3D del vehículo seleccionado (wireframe/rayos X), panel de especificaciones a la derecha, selector de vehículo.
- RF-5.3 **Dynamics**: perfil de sonido activo, presets ("Confort / Balanceado / Deportivo / Custom" — de *sonido*, no del auto), sliders de intensidad, carácter y volumen, botón Arrancar/Detener, indicador de velocidad y RPM virtual.
- RF-5.4 **Modo Conducción** (auto-activado cuando velocidad > 8 km/h por > 3 s): UI reducida a RPM grande, perfil activo, volumen, detener. Sin listas ni scroll.
- RF-5.5 Barra de estado superior: modo (P/D inferido por velocidad, no leído del auto), estado de GPS, estado de audio, hora.

### RF-6 PWA y offline
- RF-6.1 Service Worker (Workbox) que precachea shell + perfiles de sonido seleccionados.
- RF-6.2 Descarga explícita de paquetes de sonido con indicador de tamaño y progreso; gestión de almacenamiento (`navigator.storage.estimate`).
- RF-6.3 La app funciona completa sin red una vez instalada/cacheada.

---

## 4. Requisitos no funcionales

| ID | Requisito | Meta |
|---|---|---|
| RNF-1 | Latencia velocidad→audio | < 50 ms desde la estimación interpolada hasta el cambio de parámetros |
| RNF-2 | Audio sin cortes | 0 glitches audibles en 30 min de traza simulada (medido con `AudioContext.baseLatency` y eventos de underrun en Chrome) |
| RNF-3 | Rendimiento UI | ≥ 30 fps en Vehicle en MCU3; en Modo Conducción el 3D se detiene |
| RNF-4 | Carga inicial | Shell < 300 KB gz; TTI < 3 s en red 4G |
| RNF-5 | Tamaño de paquetes de sonido | ≤ 8 MB por perfil (OGG/Opus 96–128 kbps, con fallback AAC) |
| RNF-6 | Accesibilidad táctil | Objetivos ≥ 48 px (≥ 64 px en Modo Conducción); contraste AA |
| RNF-7 | Resolución objetivo | 1920×1200 (Model 3/Y) y escalado fluido hasta 1280×720 |
| RNF-8 | Privacidad | Ninguna ubicación sale del dispositivo; sin analytics de ubicación |
| RNF-9 | Compatibilidad | Chromium del vehículo (versión a confirmar en Sprint 0) y Chrome desktop para desarrollo |

---

## 5. Arquitectura

```
┌──────────────────────────── UI (React) ─────────────────────────────┐
│  AppShell · BottomNav · StatusBar · DriveModeOverlay                 │
│  VehicleScreen (R3F) · ListenScreens · DynamicsScreen · Simulator    │
└──────────────┬──────────────────────────────────┬────────────────────┘
               │ Zustand stores                   │
   ┌───────────▼──────────┐          ┌────────────▼────────────┐
   │ telemetry/           │  speed,  │ audio/                  │
   │  GeolocationSource   │  accel   │  AudioEngine (singleton)│
   │  SimulatedSource     ├─────────►│  Gearbox                │
   │  TraceReplaySource   │  60 Hz   │  EngineVoice (layers)   │
   │  KalmanEstimator     │          │  SynthVoice             │
   └──────────────────────┘          │  AmbientPlayer          │
                                     └─────────────────────────┘
   vehicles/ (catálogo JSON + modelos glb)   sounds/ (manifiestos)
   pwa/ (Workbox, gestor de paquetes)
```

### Stack
- **Vite 6 + React 19 + TypeScript (strict)**
- **Zustand** para estado; **React Router** (hash router para hosting estático simple)
- **three.js + @react-three/fiber + @react-three/drei** para el render del vehículo
- **Web Audio API** nativa (sin librerías pesadas); `AudioWorklet` solo si el perfilado lo exige
- **vite-plugin-pwa (Workbox)**
- **Vitest** (unitarias), **Playwright** (e2e en Chromium con viewport 1920×1200)
- CSS: variables + CSS Modules (o Tailwind 4 si se prefiere; decidir en Fase 0)
- Hosting: Vercel (shell) + bucket con CDN para paquetes de audio (en v1 pueden ir en `/public`)

### Estructura de carpetas
```
src/
  app/            AppShell, router, providers
  audio/          AudioEngine.ts, Gearbox.ts, EngineVoice.ts, SynthVoice.ts, AmbientPlayer.ts, profiles/
  telemetry/      sources/, KalmanEstimator.ts, haversine.ts, useTelemetry.ts
  vehicles/       catalog/*.json, VehicleModel.tsx, detectVehicle.ts
  ui/             components/ (Button, Segmented, Slider, Panel, Gauge), tokens.css
  screens/        Vehicle/, Listen/, Dynamics/, Onboarding/, DriveMode/
  pwa/            sw config, packManager.ts
  state/          stores (vehicle, audio, telemetry, settings)
public/
  models/         *.glb
  sounds/         <perfil>/manifest.json + loops
  traces/         trazas de prueba (urbano, autopista, arranque fuerte)
```

---

## 6. Modelos de datos

```ts
type VehicleId = 'model-y-juniper-dm' | 'model-3-highland-dm' | 'icar-03-4x4' | string;

interface VehicleProfile {
  id: VehicleId;
  displayName: string;          // "Model Y" (texto, sin logo)
  variant: string;              // "Juniper · Dual Motor"
  maker: string;                // "Tesla" (solo texto informativo)
  specs: {                      // valores editables, VERIFICAR con ficha oficial
    powerKw: number; powerHp: number;
    zeroTo100s: number;
    rangeKm: number; rangeCycle: 'WLTP' | 'CLTC' | 'EPA';
    batteryKwh: number; dcChargeKw: number;
    drivetrain: 'AWD' | 'RWD' | 'FWD';
  };
  model3d: { url: string; scale: number; cameraPreset: [number, number, number] };
  calibration: {
    maxSpeedKmh: number;        // para normalizar RPM
    accelRefMs2: number;        // aceleración que equivale a "carga 100 %"
  };
}

interface SoundProfile {
  id: string; name: string; kind: 'sampled' | 'synth';
  gears: number[];              // relaciones virtuales, ej. [3.2, 2.1, 1.5, 1.15, 0.9, 0.75]
  idleRpm: number; redlineRpm: number; shiftUpRpm: number; shiftDownRpm: number;
  layers?: { rpm: number; onLoad: string; offLoad?: string }[];
  synth?: { oscillators: { type: OscillatorType; harmonic: number; gain: number }[]; noise: number };
  fx: { lowpassBaseHz: number; lowpassLoadHz: number; distortion: number };
}

interface TelemetrySample { t: number; speedMs: number; accelMs2: number; source: 'gps'|'derived'|'sim'|'trace'; quality: 'good'|'stale'|'lost'; }
```

Valores iniciales de especificaciones (tomados de las imágenes de referencia; **verificar contra fichas oficiales antes de publicar**):

| Vehículo | Potencia | 0–100 | Autonomía | Batería | Carga DC | Tracción |
|---|---|---|---|---|---|---|
| Model Y Juniper Dual Motor | 384 kW | 4,3 s | 533 km WLTP | 75 kWh | 250 kW | AWD |
| Model 3 Highland Dual Motor | 366 kW | 4,4 s | 513 km WLTP | 75 kWh | 250 kW | AWD |
| iCAR 03 4x4 | 205 kW | 6,5 s | 501 km CLTC | 69,8 kWh | 80 kW | AWD |

---

## 7. Algoritmos clave

### 7.1 Estimación de velocidad
1. Muestra GPS llega (~1 Hz) → `z = coords.speed ?? haversine(prev, curr)/dt`.
2. Rechazar outliers: |Δv| > 8 m/s en 1 s o `accuracy` > 50 m.
3. Kalman (modelo de aceleración constante), Q y R configurables.
4. Bucle `requestAnimationFrame`: `v̂(t) = v + a·(t − t_ultima)`, con `a` atenuada exponencialmente (τ ≈ 0,8 s) y clamp `v̂ ≥ 0`.
5. Suavizado final de parámetros de audio con `AudioParam.setTargetAtTime` (τ ≈ 0,08 s).

### 7.2 Caja de cambios virtual
- `rpm = idle + (v / vMaxDeMarcha[g]) · (redline − idle)`; sube de marcha si `rpm > shiftUpRpm`, baja si `rpm < shiftDownRpm` (histéresis).
- Bajo carga alta, retrasar el cambio (sube a más RPM) → sensación deportiva.
- Escalar por `calibration.maxSpeedKmh` del vehículo.

### 7.3 Mezcla de capas
- Para las dos capas más cercanas a `rpm`, ganancia con crossfade de igual potencia: `g1 = cos(x·π/2)`, `g2 = sin(x·π/2)`.
- `playbackRate` de cada capa = `rpm / layer.rpm`, limitado a [0,5, 2].
- `load = clamp(a / accelRefMs2, 0, 1)` → volumen `0.4 + 0.6·load`, low-pass entre `lowpassBaseHz` y `lowpassLoadHz`.

---

## 8. Diseño de interfaz (propio, inspirado en las referencias)

Las imágenes son referencia de *atmósfera*, no plantilla. Identidad propia:

- **Paleta**: fondo `#050505`/`#0B0B0D`; acento rojo neón `#FF2A2A` con glow sutil; rojo profundo `#3A0A0A` para superficies activas; texto secundario `#8A2B2B`; un segundo acento cálido ámbar `#FF9F43` exclusivamente para el wireframe interno del vehículo (eco de las referencias, sin copiarlas).
- **Tipografía**: display geométrica tipo "Orbitron"/"Michroma" solo para cifras y títulos grandes (velocidad, RPM, nombre del modelo); "Inter"/"Rajdhani" para texto.
- **Fondo**: cuadrícula punteada en perspectiva + estelas de viento animadas (shader ligero, se pausa en Modo Conducción).
- **Vehículo**: render wireframe/rayos X con componentes internos resaltados (batería, motores) en ámbar; rotación lenta; tocar componentes muestra su especificación.
- **Navegación**: barra inferior con Vehicle · Listen · Dynamics; a la izquierda indicador de velocidad grande; a la derecha volumen.
- **Paneles laterales**: izquierda presets de sonido; derecha especificaciones del vehículo. Nunca tapan el auto.
- **Diferenciadores frente a las referencias**: sin wordmarks ni logos de marca; controles que solo afectan sonido; tacómetro virtual circular propio en Dynamics; visualizador de forma de onda que reacciona al motor.
- **Descargo** en Vehicle/onboarding: "Proyecto independiente, no afiliado a Tesla, Inc. ni a iCAR/Chery."

---

## 9. Seguridad y legal
- Advertencia en el primer arranque: configurar en Park; no interactuar al conducir; respetar la ley local.
- Volumen máximo limitado por defecto; nunca enmascarar sonidos de alerta del vehículo (no exceder un nivel razonable; documentar).
- Sin audio exterior.
- Assets de audio y 3D: propios, CC0 o con licencia comercial registrada en `ASSETS_LICENSES.md`.

---

## 10. Criterios de aceptación globales (v1)
1. Selección de vehículo funcional y persistente para los 3 modelos.
2. Con traza simulada de 10 min, el sonido sube/baja con cambios de marcha creíbles y sin glitches.
3. Modo Conducción se activa/desactiva solo, con UI reducida.
4. Listen reproduce paisajes sonoros con controles completos y Media Session.
5. Funciona offline tras la primera carga y descarga de un perfil.
6. Lighthouse PWA "instalable" y Performance ≥ 85 en desktop.
7. Informe de prueba física en vehículo (Sprint 0 + Fase 7) completado.

---

## 11. Riesgos abiertos
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Navegador bloqueado o silenciado en Drive en Colombia | Crítico (invalida Modo Conducción) | Sprint 0 antes de invertir en audio dinámico; si falla, pivotar a Modo Estático + simulador |
| GPS congelado con navegación nativa activa | Alto | Detección de "stale" y aviso; documentar |
| Rendimiento en MCU2 | Medio | Niveles de calidad; 3D desactivable |
| Licencias de samples de motor | Medio | Empezar con síntesis; grabar o comprar samples con licencia |
| Marcas/modelos 3D | Medio | Modelos propios estilizados, sin logos, descargo |
