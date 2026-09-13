# BlackMamba Music Engine · 0.1

Analizador local de audio inspirado en la referencia visual de BlackMamba RECORDS.

## Uso

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Abrir http://localhost:4173. Pulsar **Señal de prueba**, **Cargar audio** o **Activar micrófono**. El permiso del micrófono lo concede el usuario en su navegador. **Detener** libera el micrófono y detiene la reproducción. Los archivos se decodifican en memoria y se reproducen mientras se analizan; no se suben a un servidor. La señal de prueba es silenciosa.

## Implementado

Forma de onda mono, FFT de 8192 puntos, espectrograma, historial espectral en proyección 3D, detección monofónica aproximada de 55–1400 Hz, nota y cents, muestreo de amplitud en múltiplos de la fundamental, RMS, pico y factor de cresta. Referencia A4 seleccionable: 432, 440 o 442 Hz. La frecuencia de muestreo es la real del AudioContext.

## Límites de esta primera versión

La proyección 3D tiene cámara fija. No hay análisis de fase estéreo, acordes, tonalidad automática, síntesis musical, exportación ni almacenamiento. La nota puede ser inestable en mezclas o sonidos ruidosos. Los niveles representan la señal digital, no presión sonora calibrada. Los archivos grandes ocupan memoria al decodificarse completos. Requiere un navegador compatible con Web Audio; el micrófono requiere localhost o HTTPS.

## Verificación

Build de producción correcto. Detector comprobado con senos de 55, 110, 220, 440, 880 y 1300 Hz a 44.1/48 kHz (error inferior a 5 cents), y silencio. En navegador: señal 440 Hz → A4, archivo WAV 220 Hz → A3, cambio de referencia a 432 Hz → +31.8 cents, parada y fin de archivo. Sin errores de consola observados. Micrófono físico pendiente de prueba del usuario.

## macOS · versión 0.2

Instalador para Apple Silicon (arm64): abrir el DMG y arrastrar BlackMamba Music Engine a Applications. Es un build de desarrollo sin firma Developer ID ni notarización de Apple; macOS puede mostrar una advertencia al abrirlo. No requiere Node ni un servidor web para funcionar.

El selector **Tema** guarda Plata, Oscuro, Morado degradado u Océano. El botón **Diseño de referencia** muestra la captura original incluida dentro del programa. El icono también está integrado.

Para reconstruir: `npm ci` y `npm run dist:mac`. El instalador queda en `release/`. El empaquetado de escritorio se encuentra en `electron/main.cjs` y la configuración de `electron-builder` en `package.json`.

## Skill reutilizable

`skills/blackmamba-interfaces/SKILL.md` contiene el flujo de diseño, tokens de los cuatro temas, icono, captura de referencia y guía de DMG. Copiar esa carpeta a `$CODEX_HOME/skills/blackmamba-interfaces` permite descubrirlo en Codex. Invocación: `$blackmamba-interfaces crea un analizador con paneles científicos y tema morado degradado`.
