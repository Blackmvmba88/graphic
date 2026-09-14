# Roadmap · BlackMamba Music Engine

## Implementado · Version 0.4

- [x] **Rediseño Visual de Alta Fidelidad**: Reconstrucción de la anatomía visual de la imagen de referencia (Header con Pestañas `Live`, `Analysis`, `Harmonics`, `Tuning`, `Spectral`, `Settings`, Badge estéreo `Audio Input 48 kHz · 24 bit`).
- [x] **Superficie Espectral 3D**: Malla tridimensional continua multicolor con ejes proyectados y leyenda `High Energy` / `Low Energy`.
- [x] **Vectorscope y Fase Estéreo**: Medidor polar de fase L/R y Vectorscope XY en vivo.
- [x] **Componentes Senoidales**: Visualización de capas armónicas superpuestas (1x a 5x).
- [x] **Escala Musical y Tonalidad**: Detector de escala, notas armónicas de escala (`A Major`) e índice de confianza (`Key Confidence`).
- [x] **🧠 Capa de Inteligencia Acústica Local**: Motor de aprendizaje en tiempo real, guardado de huellas tímbricas en `localStorage` y retroalimentación del usuario (`Aceptar` / `Corregir`).
- [x] **📱 Soporte Android Nativo**: Estructura de proyecto Gradle en `android/`, `AndroidManifest.xml` con permisos de micrófono `RECORD_AUDIO` y `capacitor.config.json`.
- [x] **🐳 Dockerización**: `Dockerfile` multi-stage y `docker-compose.yml`.
- [x] **⚡ Metacomandos CLI & API.md**: Runner `npm run meta` y documentación API detallada.

## Próximos Pasos · v0.5

- [ ] Síntesis MIDI y reproducción de patrones armónicos desde la app Android.
- [ ] Exportación de huellas tímbricas aprendidas en formato JSON / Dataset.
