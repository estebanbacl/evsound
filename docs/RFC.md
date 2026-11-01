# RFC: Plataforma Web de Efectos de Sonido para Vehículos Eléctricos (EVs)

## 1. Resumen Ejecutivo

Crear una aplicación web accesible desde los navegadores integrados de vehículos eléctricos que permita personalizar la experiencia auditiva del conductor y su entorno. La plataforma ofrecerá dos modos principales: reproducción de sonidos en estado de parqueo/carga (similar al modo Boombox) y la simulación dinámica de sonidos (motores clásicos, sci-fi) que acompañen la aceleración del vehículo en tiempo real usando el navegador activo.

## 2. Motivación

Los vehículos eléctricos carecen del feedback acústico de la aceleración tradicional y los sistemas de infoentretenimiento actuales son ecosistemas muy cerrados. Construir esto como una aplicación web evita instalaciones complejas de hardware (OBD2 + módulos de sonido) y permite iteraciones de producto mucho más ágiles. Esto habilita una biblioteca de sonidos basada en la comunidad y actualizaciones continuas sin depender de los ciclos de release del fabricante del vehículo.

## 3. Arquitectura y Tecnologías

La arquitectura debe orientarse a un rendimiento de muy baja latencia en el cliente (navegador del vehículo).

- **Frontend:** React o Next.js exportado como una Single Page Application (SPA) para habilitar capacidades de Progressive Web App (PWA). Esto permite cachear todos los assets de audio localmente usando Service Workers, eliminando la dependencia de la conexión de red celular del vehículo durante la conducción.
- **Audio Engine:** Uso intensivo de la Web Audio API para la manipulación de pitch, modulación de frecuencias y crossfading de loops en tiempo real sin latencia perceptible.
- **Telemetría y Sensores:** La Geolocation API (`watchPosition`) se utilizará para calcular la velocidad y derivar la aceleración. Alternativamente, la DeviceOrientation / DeviceMotion API si el navegador de a bordo expone los acelerómetros internos.
- **Despliegue y Hosting:** Vercel para el frontend y Google Cloud Storage (o AWS S3) detrás de un CDN para la entrega rápida de los archivos `.wav`/`.mp3`.

## 4. Casos de Uso

### 4.1. Modo Estático (Parqueo y Carga)

Cuando el vehículo está en Park, el usuario puede abrir la web y seleccionar ambientes sonoros o listas de reproducción. Si el vehículo lo permite (ej. ruteo de audio a altavoces externos para advertencia de peatones PWS), el sonido puede proyectarse al exterior.

### 4.2. Modo Conducción Dinámica

El usuario abre la aplicación y selecciona un perfil de sonido (ej. V8 Americano, Nave Espacial). Al iniciar la marcha, la lógica en el cliente monitorea la velocidad y ajusta dinámicamente:

- **Pitch (Tono):** Sube conforme aumenta la velocidad calculada.
- **Volumen:** Relacionado directamente a la derivada de la velocidad (aceleración inmediata).

## 5. Riesgos Técnicos y Mitigaciones

- **Restricciones de Seguridad del Navegador:** Los sistemas Chromium a bordo a menudo suspenden o mutean el navegador web cuando el selector de marchas pasa a Drive, o no permiten que la web siga ejecutando procesos de audio si no está visible.
  - *Mitigación:* Diseñar la UI para ser utilizada en pantalla dividida (split-screen) si el SO del vehículo lo soporta, o investigar APIs de Media Session para mantener la sesión de audio activa en background.
- **Resolución y Latencia del GPS:** La Geolocation API típicamente reporta a 1Hz. Una actualización de velocidad por segundo generará una modulación de audio escalonada y poco natural.
  - *Mitigación:* Implementar un motor de física ligero e interpolación matemática en el frontend que suavice las transiciones entre las muestras de 1Hz, simulando una curva de aceleración continua.

## 6. Siguientes Pasos

1. Desarrollar una Prueba de Concepto (PoC) enfocada en el frontend.
2. Validar la persistencia de audio realizando pruebas físicas directas en navegadores de a bordo para entender las restricciones al cambiar a Drive.
3. Medir la latencia del GPS vs. la sensación real de aceleración en cabina.

## 7. Diseño de Interfaz (UI/UX)

La interfaz de usuario debe mantener una estética futurista y minimalista basada en un modo oscuro (Dark Mode) profundo, con acentos y tipografía en colores de alto contraste (rojo neón) inspirados en conceptos de ciencia ficción.

- **Representación del Vehículo:** El elemento visual central será un render 3D del vehículo con un estilo transparente, de rayos X o wireframe (mostrando componentes internos), posicionado sobre un fondo de cuadrícula punteada en perspectiva y estelas de viento dinámicas.
- **Modelos Disponibles:** El modelo 3D interactivo en la pantalla debe ser estrictamente un Tesla Model Y o un Tesla Model 3, ICAR 03 según la elección y configuración del usuario.
- **Distribución:** La navegación principal se ubicará en una barra inferior (con secciones como Vehicle, Listen, Dynamics), acompañada de controles de reproducción multimedia y paneles de ajustes visualmente integrados a los lados para no obstruir la vista del coche.
