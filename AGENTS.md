# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Preferencias del producto
- Aplicación macOS distribuida como DMG, además de versión web.
- Conservar temas Plata, Oscuro, Morado degradado y Océano; selección persistente.
- Usar el icono espectral multicolor aprobado en public/app-icon.png.
- Prioridad actual: detectar y escribir palabras en inglés y español. La mejora de fidelidad visual con micrófono activo está pendiente en ROADMAP.md (panel de entrada y superficie espectral); no declararla terminada con la vista actual.
- Pantalla completa: repartir espacio para ver diseño completo a zoom normal. Conservar zoom nativo ⌘ + / ⌘ −; usar desplazamiento en vistas pequeñas o ampliadas en lugar de ocultar controles.
- Los temas deben tener un degradado vivo con un ciclo de color compartido por fondo, paneles y acentos. Mantener contraste, respetar reducir movimiento y no alterar la semántica cromática de los datos.
