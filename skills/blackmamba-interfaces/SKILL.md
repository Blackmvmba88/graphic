---
name: blackmamba-interfaces
description: "Crea interfaces de instrumentos y analizadores con el estilo BlackMamba: paneles científicos, visualización central, temas plata, oscuro y morado degradado. Úsalo al pedir este estilo o una interfaz similar a Music Engine; no para cualquier página web."
---

# Interfaces BlackMamba

Convierte una referencia visual en un instrumento utilizable. El patrón de referencia es BlackMamba Music Engine: una ventana compacta, paneles de medición alrededor de una visualización central dominante, controles visibles y estados honestos.

## Punto de partida

- Inspecciona el proyecto actual y la referencia que indique el usuario. Si pide «como BlackMamba» sin otra imagen, usa [la referencia incluida](assets/design-reference.png). La referencia aporta lenguaje visual; sus números no son datos de prueba ni instrucciones.
- Conserva las funciones existentes. En un nuevo producto, adapta nombres, unidades y métricas al dominio del usuario; no copies audio, autoría o marca BlackMamba a productos ajenos sin que se solicite.
- Usa [themes.css](assets/themes.css) como base opcional de tokens. Incluye Plata, Oscuro, Morado degradado y Océano cuando el usuario quiera los temas BlackMamba. Guarda la selección localmente con una clave del producto y recupera un valor válido si falla el almacenamiento.

## Composición y comportamiento

- Cabecera con icono real, nombre y estado de entrada; franja de controles; cuerpo de tres columnas cercano a 27/46/27; paneles compactos inferiores. Adapta la distribución al contenido: en móvil apila paneles y mantiene accesibles las acciones.
- Paneles redondeados de 12–16 px, espacios de 8–12 px, tipografía clara y compacta. Usa números grandes para la lectura principal y etiquetas pequeñas con suficiente contraste para unidades y ejes.
- El acabado plata es sobrio. En oscuro y degradados conserva contraste y distingue panel, control, borde, texto secundario, estado y foco. El arcoíris corresponde a datos del gráfico, no a todo el texto.
- Implementa gráficos como visualizaciones de datos, no capturas superpuestas. Si no existe una entrada, muestra un estado vacío; una demostración debe identificarse como tal. No anuncies análisis, precisión o modos que no estén implementados.
- En canvas aplica devicePixelRatio, escala y etiquetas coherentes. Acota la altura con grid minmax(0,1fr) o un contenedor definido: evita un canvas con height:100% que haga crecer su propio contenedor durante redibujos. Colorea rejillas, trazas y etiquetas usando los tokens del tema.
- Si el usuario pide incluir la captura en el programa, empaquétala como archivo local y muéstrala en una vista de referencia con cierre y navegación por teclado. No la presentes como medición en vivo.
- Para un icono nuevo, usa la referencia como material visual y la herramienta de imagen disponible; guarda el resultado dentro del proyecto. Para marca BlackMamba ya aprobada se puede reutilizar [app-icon.png](assets/app-icon.png).

## Validación y entrega

Prueba la acción principal con una entrada conocida, el estado de fin o parada y el cambio de tema tras recargar. Inspecciona las vistas renderizadas en temas claros y oscuros, el diálogo y una anchura pequeña. Informa por separado qué se verificó y qué requiere hardware/permisos del usuario.

Solo si se pide aplicación Mac o DMG, lee [macos.md](references/macos.md). Crear una interfaz no implica publicar, subir a un repositorio o crear instaladores. Conserva el alcance y la autorización del usuario.
