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

La proyección 3D tiene cámara fija. No hay análisis de fase estéreo, acordes, tonalidad automática, síntesis musical ni almacenamiento de grabaciones. La nota puede ser inestable en mezclas o sonidos ruidosos. Los niveles representan la señal digital, no presión sonora calibrada. Los archivos grandes ocupan memoria al decodificarse completos. Requiere un navegador compatible con Web Audio; el micrófono requiere localhost o HTTPS.

## Verificación

Build de producción correcto. Detector comprobado con senos de 55, 110, 220, 440, 880 y 1300 Hz a 44.1/48 kHz (error inferior a 5 cents), y silencio. En navegador: señal 440 Hz → A4, archivo WAV 220 Hz → A3, cambio de referencia a 432 Hz → +31.8 cents, parada y fin de archivo. Sin errores de consola observados. Micrófono físico pendiente de prueba del usuario.

## macOS · versión 0.2

Instalador para Apple Silicon (arm64): abrir el DMG y arrastrar BlackMamba Music Engine a Applications. Es un build de desarrollo sin firma Developer ID ni notarización de Apple; macOS puede mostrar una advertencia al abrirlo. No requiere Node ni un servidor web para funcionar.

El selector **Tema** guarda Plata, Oscuro, Morado degradado u Océano. El botón **Diseño de referencia** muestra la captura original incluida dentro del programa. El icono también está integrado.

Para reconstruir: `npm ci` y `npm run dist:mac`. El instalador queda en `release/`. El empaquetado de escritorio se encuentra en `electron/main.cjs` y la configuración de `electron-builder` en `package.json`.

## Skill reutilizable

`skills/blackmamba-interfaces/SKILL.md` contiene el flujo de diseño, tokens de los cuatro temas, icono, captura de referencia y guía de DMG. Copiar esa carpeta a `$CODEX_HOME/skills/blackmamba-interfaces` permite descubrirlo en Codex. Invocación: `$blackmamba-interfaces crea un analizador con paneles científicos y tema morado degradado`.

## Voz y sonidos · versión 0.3

**Palabras en vivo** utiliza Whisper Base multilingüe, local, con modo automático y selección Español / English. Al abrir la app se solicita el micrófono (macOS decide el consentimiento); una vez autorizado, puede iniciarse automáticamente en siguientes aperturas. Se puede desactivar **Micrófono al abrir**, pausar **Transcribir** o detener la entrada. La app procesa en segundo plano mientras permanece abierta y termina al salir: no instala un servicio de inicio de sesión.

Texto por pausas o fragmentos de hasta 8 segundos. Inglés y español pueden alternarse entre fragmentos; frases cortas, idiomas mezclados y voz sobre música pueden requerir corrección. Una cola limitada muestra un aviso si el equipo no alcanza el ritmo. Guardar texto exporta TXT. El texto permanece en la sesión; no se almacena la grabación. Los WAV temporales de transcripción se eliminan al terminar cada trabajo.

AudioSet sugiere etiquetas secundarias con **Sí / No / Corregir**. Las últimas 200 revisiones se guardan localmente; no reentrenan el modelo. Sus puntuaciones no son una probabilidad calibrada de certeza.

Los modelos están dentro del DMG y no se envía audio a una API. La versión web mantiene los visuales, pero voz y etiquetas locales requieren la app Mac. El build usa los recursos reproducibles de `native/README.md`. Ver `ROADMAP.md` para la mejora pendiente del panel de micrófono y superficie 3D.

## Temas vivos, reproducción y actualizaciones · 0.3

Los cuatro temas comparten un ciclo cromático continuo de 48 segundos: fondo, paneles, bordes y acentos cambian coordinadamente. Plata y Oscuro son más sutiles; Morado y Océano tienen mayor intensidad. Los colores de los datos conservan su significado. La preferencia de sistema «Reducir movimiento» detiene el ciclo.

Micrófono y archivo son fuentes independientes: activar o apagar el micrófono no detiene la reproducción. Se analiza la mezcla cuando ambas están activas; la voz del micrófono no se devuelve a los altavoces. El escritorio reparte la altura disponible y las ventanas pequeñas o ampliadas conservan desplazamiento.

Desde esta versión, **Actualizar** permite seleccionar un DMG posterior y reiniciar conservando preferencias y revisiones. Valida versión, identificador y arquitectura, conserva el instalador y una copia de la app anterior. La app debe estar fuera del DMG, en una carpeta con permiso de escritura. No busca actualizaciones por internet ni verifica una firma Developer ID. El reemplazo real sobre la app del usuario queda pendiente de prueba con una próxima versión; no se reemplazó durante validación.
