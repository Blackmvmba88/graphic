# BlackMamba Music Engine · v0.4

Estación de análisis acústico en tiempo real, laboratorio de sonido e inteligencia tímbrica creada por **BlackMamba RECORDS** (*Iyari Gomez / "El sonido se convierte en conocimiento"*).

![Diseño de Referencia](./public/app-icon.png)

## 🚀 Características Principales

* **Fidelidad Visual Absoluta**: Pestañas de navegación (`Live`, `Analysis`, `Harmonics`, `Tuning`, `Spectral`, `Settings`), badge de entrada de audio estéreo en vivo (`48 kHz · 24 bit`).
* **Superficie Espectral 3D**: Malla tridimensional continua interactiva (Amplitude 0.0–1.0, Time ms, Frequency 20–20kHz) con degradado espectral (Rojo a Azul/Púrpura) y leyenda de energía (`High Energy` / `Low Energy`).
* **Fase Estéreo & Vectorscope**: Medidor polar de fase L/R y dispersión XY Vectorscope con correlación en tiempo real.
* **Componentes Senoidales Armónicos**: Visualización de capa senoidal superpuesta (1x, 2x, 3x, 4x, 5x fundamental).
* **Detección de Escala y Tonalidad**: Detector de nota (`A4`), desviación en cents (`+2.3 ¢`), selector de escala (`A Major`) e índice de confianza (`Key Confidence`).
* **🧠 Capa de Inteligencia Acústica Local**: Motor de aprendizaje en tiempo real que identifica huellas tímbricas (Voz humana, instrumentos, sub-bajos, mezclas), almacena patrones en memoria local y mejora progresivamente con retroalimentación del usuario (`Aceptar` / `Corregir`).
* **📱 Soporte Android Nativo**: Proyecto Gradle listo en `android/` y configuración Capacitor (`capacitor.config.json`) para compilación en móviles Android.
* **🐳 Dockerización & Metacomandos CLI**: `Dockerfile` multi-stage y runner de metacomandos (`npm run meta`).

---

## 💻 Uso e Instalación Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Ejecutar pruebas
npm test
```

---

## ⚡ Suite de Metacomandos CLI

```bash
# Ver metacomandos disponibles
npm run meta help

# Construir versión web optimizada
npm run meta build

# Compilar / sincronizar paquete Android
npm run meta build:android

# Iniciar contenedor Docker
npm run meta docker:up
```

---

## 📱 Compilación para Android

El proyecto incluye la infraestructura nativa para Android en `android/`:

1. Asegúrate de compilar la versión web con `npm run build:android`.
2. Abre la carpeta `android` en **Android Studio**.
3. El archivo `AndroidManifest.xml` ya incluye los permisos nativos de micrófono `RECORD_AUDIO` y `MODIFY_AUDIO_SETTINGS`.
4. Ejecuta o genera el APK desde Android Studio o con `./gradlew assembleDebug`.

---

## 🐳 Despliegue con Docker

```bash
docker compose up -d --build
```
La aplicación web se ejecutará en `http://localhost:4173`.
