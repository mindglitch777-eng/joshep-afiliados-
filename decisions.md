# Decisiones — Misión 5 (lote de 28)
decisión | motivo | evidencia | riesgo
---|---|---|---
Repo sigue público; nada sensible se commitea | no puedo cambiar la visibilidad; Actions gratis en público | API: "visibility": "public" | IDs pasan como input enmascarado del workflow (no quedan en el repo ni en los logs)
Edición automática (plan_builder.py) con anclas de texto en vez de índices | 28 clips: los índices de palabra dependen de whisper medium en el runner | en el reel 23 los tramos automáticos coinciden con los hechos a mano (±0,2 s) | si whisper oye distinto, el ancla aproximada (≥60% de coincidencia) puede caer en otra frase
Recorte por duración: saco frases largas sin anclas, nunca la 1ª ni la última | contenido ≤45 s sin cortar palabras | reglas de la misión | puede sacar una frase con contenido; plan.override.json lo corrige
Número grande al costado de la etiqueta (no debajo) | con 2 líneas debajo la tarjeta medía 540 px y tapaba la cara | validar: −34 px de la cara (58 cuadros) → 56 px con el costado | etiqueta en hasta 3 líneas cortas
Fuente del número 460 px | cifra Montserrat 900 ≈ 0,70 em → 322 px (meta ≥300) | validar: numero_cifra_px 322 | si la tarjeta se achica <93% no llega a 300 (lo marca el QA)
Gancho delante: borde inferior ≥30 px sobre la cabeza al armarlo (QA exige ≥16) | el asentamiento 1,12→1 agranda el texto en los 6 primeros cuadros | validar en 23: aire mín. 36 px, 0 cuadros <16 | el gancho puede quedar en 72 px (más chico que el subtítulo)
Cabeza = frente − 18% de la cara | mismo valor calibrado en el piloto con la segmentación | clip 11 del piloto | pelo alto/gorra: margen de 30 px
Video baja hasta 12% durante el gancho (antes 6%) | para que el gancho entre arriba de la cabeza | 23: bajada 39 px | más relleno degradado arriba en el primer segundo
Flash: rampa 100/80/60/45% sobre brillo 1,45 | regla: +20% mínimo durante 4 cuadros | 1+0,45×0,45 = 1,20 | —
Flash también sobre la persona recortada (capas) | antes el recorte tapaba el flash | código Fondo.tsx | —
Botón «LINK EN MI PERFIL» propio sobre el CTA, todo el cierre | los CTA de Joseph no siempre muestran el botón; regla ≥2 s | validar: 3,0 s visible | —
CTA 1,0–5,2 s a 1,3x (3,2 s) | igual que el piloto; regla ≤1,4x | piloto | —
Escena/ecuación como tarjeta blanca bajo la cara (no pantalla completa) | Joseph sigue a cámara y se oye; reglas de tarjeta y distancia ya medidas | cuadros de prueba | ilustraciones chicas en pantalla (808×380 px)
Ecuación en una fila (A op B) + segunda fila (= C) | 3 filas hacían la tarjeta de >450 px | cuadros de prueba | texto de los bloques ~46 px
Número de 22 y 30 aparece durante el gancho | la cifra la dice en la primera frase | transcripción | gancho y tarjeta a la vez (el QA no cuenta el gancho)
Censura agrega «cagar/cagan/cagas» a la lista | mismas palabras en 09 y 18 conjugadas | transcripción | —
Compresión a 2 pasadas, objetivo 13,4 MB | ≤14 MB manteniendo 1080x1920 60 fps | página del piloto: 12–15 MB a ~2,5 Mbps | menos nitidez en movimiento
Calendario: estilo rota punch→push→capas→mano desde el día 6 | sin repetir estilo; capas 1 de cada 4 | plans/calendario.csv | —
CTA alternativo cuando el del tema repite el día anterior | regla: no repetir CTA seguido | calendario.py | CTA menos específico del tema
Reintento solo si el plan puede corregir la falla | no gastar renders en fallas que el plan no cambia | lote.yml | —
