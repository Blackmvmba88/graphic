# Entrega macOS

Si ya existe un runtime de escritorio, mantenlo. Para una interfaz web local, Electron es una opción práctica: empaqueta el build completo, usa rutas relativas y evita depender de un servidor de desarrollo o fuentes remotas.

- BrowserWindow con contextIsolation y sandbox activados, nodeIntegration desactivado. Restringe navegación y nuevas ventanas al contenido local. Permite solo los permisos que la función requiere; para audio, únicamente micrófono solicitado por el usuario desde la ventana de la app.
- Declara NSMicrophoneUsageDescription con la finalidad real. El acceso de macOS debe pasar por su consentimiento normal; no actives permisos ni elimines protecciones del sistema durante pruebas.
- Prepara icono PNG y ICNS con iconutil. Configura identidad, versión, categoría y un DMG con la app y un enlace a Applications. Excluye node_modules de desarrollo, temporales y archivos privados del empaquetado.
- Selecciona arquitectura según destino; si solo se conoce el Mac local, detecta su arquitectura e indica el resultado. No llames universal a un build arm64.
- Ejecuta build, abre la app empaquetada y valida recursos sin servidor, cambio de tema, cierre del diálogo y una señal de prueba. Comprueba la integridad del DMG y su contenido; no equipares éxito del build con prueba de micrófono físico.
- Diferencia firma ad hoc de Developer ID y notarización. Entrega el DMG aunque no haya credenciales para notarizar, declarando esa limitación. No desactives Gatekeeper ni modifiques llaveros.
- Conserva instrucciones reproducibles y un checksum del instalador. Publica o sube archivos solo dentro del alcance autorizado.
