# CLAUDE.md — EV Sound Studio

Contexto permanente para Claude Code en este repo.

## Fuentes de verdad
- `docs/SPEC.md`: qué construir (requisitos, arquitectura, modelos de datos, algoritmos, diseño).
- `docs/PLAN.md`: en qué orden. Trabaja solo la fase indicada; no adelantes fases.
- Si algo del pedido contradice docs/SPEC.md, pregunta antes de implementar.

## Stack y comandos
- Vite + React 19 + TypeScript strict · Zustand · React Router (HashRouter) · three.js/R3F · Web Audio API · vite-plugin-pwa · Vitest · Playwright
- `npm run dev` · `npm run build` · `npm run check` (tsc + eslint + vitest) · `npm run e2e`
- Antes de dar una tarea por terminada: `npm run check` en verde (y `npm run e2e` si tocaste UI).

## Reglas de dominio (no negociables)
1. **Audio solo en cabina.** Nunca intentar audio exterior/PWS.
2. **La app no controla ni lee el vehículo.** Ningún control de UI puede sugerir que cambia aceleración, suspensión, carga, Sentry, etc. Todo ajuste es de sonido.
3. **Sin logos ni wordmarks de marcas.** Nombres de modelo solo como texto. Mantener el descargo de no afiliación.
4. **AudioContext solo tras gesto del usuario.** Manejar `suspended` y reanudar.
5. **La telemetría nunca sale del dispositivo.**
6. **Modo Conducción = UI mínima**: objetivos ≥ 64 px, sin scroll, 3D y fondo pausados.
7. **Lógica pura separada de Web Audio/DOM** (Gearbox, Kalman, haversine son funciones/clases puras con tests).
8. `localStorage` siempre envuelto en try/catch; la app debe funcionar sin él.
9. Todo asset nuevo (audio, 3D, fuentes, imágenes) se registra en `ASSETS_LICENSES.md`. Preferir síntesis o generación por código.

## Convenciones
- Código e identificadores en inglés; textos de UI en español (preparar `src/i18n/es.ts`).
- Componentes funcionales, hooks con prefijo `use`, stores en `src/state/*Store.ts`.
- Unidades internas SI (m/s, m/s²); convertir a km/h solo en la UI.
- Commits convencionales (`feat:`, `fix:`, `test:`, `chore:`), uno por fase o subtarea.
- No agregar dependencias pesadas sin justificarlo en el plan de la fase.

## Pruebas sin auto
- Usa `SimulatedSource` o `TraceReplaySource` (trazas en `public/traces/`).
- Viewport de referencia: 1920×1200 táctil (proyecto Playwright `car`).
- Referencias visuales de UX: `docs/referencias/Interfaz*.png`
