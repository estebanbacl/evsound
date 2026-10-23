# Checklist de prueba de campo (Sprint 0 + Fase 7)

Objetivo: confirmar en el vehículo real las suposiciones que pueden invalidar el producto (SPEC §0 R2/R3, §11). **Hazla con el vehículo en Park al configurar y con una segunda persona conduciendo/observando para las pruebas en movimiento.** No interactúes con la pantalla mientras conduces.

Registro: copia `docs/field-tests/PLANTILLA.md` a `docs/field-tests/AAAA-MM-DD-<modelo>.md` y adjunta los JSON exportados.

## 0. Preparación
- [ ] Abrir `https://<tu-despliegue>/diagnostics/index.html` en el navegador del auto.
- [ ] Anotar: modelo, año/software (aparece en el UA como `Tesla/…`), versión de Chromium, resolución y `devicePixelRatio`.
- [ ] Revisar la tabla de soporte (DeviceMotion, Service Worker, Cache Storage, storage.estimate, Media Session, Wake Lock, WebGL2).

## Protocolo Sprint 0 (página de diagnóstico)
| # | Prueba | Pasos | Registrar | ✔ |
|---|---|---|---|---|
| P1 | Audio en Park | "Iniciar audio" | ¿Suena el tono de 220 Hz? `state`, `baseLatency`, `outputLatency` | ☐ |
| P2 | Paso a Drive | Con el tono sonando, pasar a D | ¿Sigue sonando? ¿Se cierra/bloquea el navegador? Eventos `visibilitychange`/`freeze`/`statechange` | ☐ |
| P3 | Conducción 5 min (ciudad) | "Iniciar GPS" | Frecuencia media, `coords.speed` nulo (cuántas veces), `accuracy` | ☐ |
| P4 | Pantalla dividida | Abrir la navegación nativa | ¿Se congela el GPS? ¿Sigue el audio? | ☐ |
| P5 | Música nativa | Reproducir radio/streaming del auto | ¿Se mezclan o uno silencia al otro? | ☐ |
| P6 | Offline | Tras cargar la app, sin datos | ¿El Service Worker sirve la página? | ☐ |

**Gate:** si P2 falla (el audio muere en Drive), el Modo Conducción pasa a *experimental* y se prioriza Modo Estático + Simulador (SPEC §11). Exportar el log (`Exportar log (JSON)`) tras cada prueba.

## Fase 7 · App completa (una vez por modelo: Model Y, Model 3, iCAR 03)
Abrir la app instalada/cargada y seguir:

### Onboarding y vehículo
- [ ] Aparece el aviso de seguridad y luego la selección; el vehículo **sugerido** coincide (o es confirmable) y se puede cambiar.
- [ ] La selección persiste tras recargar. Cambiar desde **Vehículo** actualiza modelo 3D, especificaciones y calibración.
- [ ] Las especificaciones coinciden con la ficha oficial → si es así, poner `"verified": true` en el JSON del vehículo.
- [ ] 3D fluido (anotar fps desde el panel oculto: **5 toques en la hora**). Si <30 fps, anotar calidad elegida.

### Audio (en Park, modo Simulador)
- [ ] "Arrancar motor" requiere un toque y suena por **cabina**. Nunca por el exterior.
- [ ] Acelerador virtual: RPM sube, cambios de marcha audibles y creíbles, soltar baja suave.
- [ ] Los 4 perfiles se distinguen; presets Confort/Balanceado/Deportivo cambian carácter y puntos de cambio.
- [ ] Volumen máximo razonable: **no enmascara** las alertas del vehículo (probar con una alerta real).
- [ ] 30 min de traza simulada (`Traza → Autopista`, x1, en bucle manual) sin cortes ni *glitches* audibles; anotar `latencia telemetría→audio` del panel oculto (meta < 50 ms).

### Conducción (acompañado)
- [ ] Fuente **GPS**: la velocidad de la app coincide con el tablero ±3 km/h; anotar frecuencia GPS y si hay señal "congelada".
- [ ] **Modo Conducción** aparece tras >8 km/h sostenido 3 s y desaparece tras <3 km/h sostenido 5 s; UI mínima, objetivos grandes, sin scroll.
- [ ] Al perder/congelar GPS: indicador en la barra de estado y RPM a ralentí suave.
- [ ] Con navegación nativa activa: ¿GPS estable? ¿audio estable?

### Listen y offline
- [ ] Reproducir una colección; controles completos; Media Session (metadatos/controles del sistema si existen).
- [ ] Descargar un paquete en "Sonidos descargados"; poner modo avión; recargar: la app y ese paquete funcionan.
- [ ] Aviso de nueva versión visible solo en Park (nunca en Conducción).

### Cierre
- [ ] Adjuntar los JSON de diagnóstico y completar la plantilla. Resumir riesgos abiertos (GPS congelado, MCU2, bloqueo del navegador en Drive).
