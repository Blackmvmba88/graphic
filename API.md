# API y Metacomandos · BlackMamba Music Engine

Documentación técnica de la API de Audio Engine, Capa de Inteligencia Acústica y la Suite de Metacomandos CLI.

---

## 1. Metacomandos CLI (`npm run meta <comando>`)

El motor incluye una interfaz de metacomandos ejecutable para operaciones rápidas:

```bash
# Ver ayuda de metacomandos
npm run meta help

# Construir aplicación web
npm run meta build

# Preparar paquete nativo para Android
npm run meta build:android

# Iniciar contenedor Docker
npm run meta docker:up

# Detener contenedor Docker
npm run meta docker:down

# Ejecutar suite de pruebas
npm run meta test

# Comprobar estado del motor
npm run meta status
```

---

## 2. API del Motor de Audio (`AudioEngine`)

Clase responsable de la captura de señal, FFT, seguimiento de tono y fase estéreo.

### Métodos Principales

* `async microphone(deviceId?: string): Promise<void>`  
  Captura el audio del micrófono del sistema o de la entrada especificada.

* `async file(file: File, onEnd?: () => void): Promise<boolean>`  
  Decodifica y reproduce un archivo de audio local sin enviarlo a servidores.

* `sample(): AudioSampleData | null`  
  Muestra una captura en tiempo real de la señal actual.

#### Contrato de Retorno (`AudioSampleData`):
```ts
interface AudioSampleData {
  correlation: number | null; // Correlación estéreo (-1.0 a +1.0)
  leftRms: number;           // Nivel RMS Canal Izquierdo (dBFS)
  rightRms: number;          // Nivel RMS Canal Derecho (dBFS)
  micRms: number | null;      // Nivel de micrófono (dBFS)
  rms: number;               // Nivel RMS general (dBFS)
  peak: number;              // Pico máximo de señal (dBFS)
  hz: number | null;         // Frecuencia fundamental detectada (Hz)
  rate: number;              // Frecuencia de muestreo (ej. 48000 Hz)
}
```

---

## 3. Capa de Inteligencia Acústica (`AudioIntelligenceEngine`)

Motor de aprendizaje continuo de huellas tímbricas en cliente local.

### Métodos

* `analyzeSample(sampleData: AudioSampleData): IntelligenceSummary`  
  Clasifica la señal acústica e incrementa la memoria local de patrones.

* `rememberPattern(fingerprint: AcousticFingerprint): void`  
  Almacena un patrón tímbrico en `localStorage`.

* `addFeedback(isCorrect: boolean): void`  
  Ajusta el porcentaje de precisión del modelo adaptativo basado en retroalimentación del usuario.

---

## 4. Despliegue Docker

Construcción e inicio rápido del contenedor:

```bash
docker compose up -d --build
```

La aplicación estará disponible en `http://localhost:4173`.
