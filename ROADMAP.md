# Roadmap · BlackMamba Music Engine

## Implementado · 0.3

- [x] Whisper local: texto durante los visuales, inglés y español con detección automática y selector manual.
- [x] Micrófono al abrir, con consentimiento inicial de macOS, estado visible y parada.
- [x] Etiquetas de sonidos con Sí / No / Corregir y revisiones persistentes.

## Próxima prioridad visual · micrófono y referencia

Solicitud del usuario, 13 de septiembre de 2026: al activar el micrófono, la interfaz no se ve como el diseño de referencia. Captura aportada: panel Entrada con texto simple, sin los controles visuales de la referencia.

- [ ] Recrear el panel Entrada: icono de micrófono, selector real de dispositivo, medidor de entrada dinámico, indicador Live y datos reales de frecuencia de muestreo/nivel.
- [ ] Acercar la superficie espectral a la referencia: superficie continua con malla, ejes y leyenda, iluminación y proporciones; siempre alimentada por audio real.
- [ ] Revisar densidad, tamaños y distribución del resto de paneles en los cuatro temas.
- [ ] Comparar capturas al mismo tamaño de ventana con micrófono activo y documentar diferencias restantes. La forma matemática exacta cambia con el sonido; no reemplazar datos reales con una animación decorativa.

Criterio de aceptación: controles y jerarquía visual de la referencia reconocibles, dispositivo seleccionable, nivel que responde al micrófono y superficie continua que representa la señal. Esta mejora visual está planificada y todavía no se considera implementada.

## Ajuste a pantalla completa · 0.3

- [x] Distribuir altura disponible entre cabecera, transcripción, gráficos y paneles inferiores; mantener todo visible en escritorio a zoom normal.
- [x] Conservar zoom ⌘ + / ⌘ − y desplazamiento cuando el tamaño ampliado ya no permita mostrar todo sin recortes.

## Sistema y distribución · 0.3

- [x] Ciclo cromático compartido y respeto a reducir movimiento.
- [x] Fuentes de micrófono y archivo independientes.
- [x] Actualización mediante DMG posterior seleccionado por el usuario; conserva preferencias y copia de respaldo.
- [ ] Validar reemplazo real en una actualización posterior.
- [ ] Firma Developer ID, notarización y búsqueda automática de actualizaciones.
