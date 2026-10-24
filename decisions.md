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
Flash de arranque también en "mano" | regla: flash en el cuadro 0 de todos los clips | prueba: 20, 09 y 06 (mano) fallaron «cuadro 0: no» | —
Video sube hasta 24% (antes 20%) para que el mentón quede ≥24 px sobre el subtítulo | en el 20 Joseph se inclina y con 20% quedaba a 2 px (28 cuadros) | validar local con el plan del runner: 52 px | más relleno oscuro abajo en esos momentos
Botón del CTA en la franja de arriba (y 166–250) | en el centro tapaba el texto de la animación de Joseph | hojas de contacto de la prueba | el botón de Joseph sigue abajo (queda bajo la UI de TikTok)
Ola 1 sale junto con la repetición de la prueba | las 2 fallas eran de plantilla (no de formato) y validar ya las da por resueltas en los 3 planes | flash y mentón medidos con validar | si algo más falla, se reintenta por clip
Sin chip propio en el cierre: los 13 CTA traen «Link en mi perfil» | el chip tapaba el título y duplicaba el botón | ctas_hoja.jpg: botón visible en el cuadro de 4 s en los 13 (OCR lo leyó solo en 10 y 33) | el botón de Joseph está a ~1540 px, en la franja de la descripción de TikTok
CTA: tramo 1,5–5,9 s a 1,3x + último cuadro sostenido hasta 2,1 s de botón | regla: botón ≥ 2 s; aceleración ≤ 1,4x | botón a los 4,0 s → 1,9 s dentro del tramo + 0,6 s sostenido | cierre de ~4 s (antes 3,2)
Cara→CTA con corte seco y barrido de 7 cuadros (whoosh), sin fundido al final | con fundido asomaba la cara sobre el libro | pedido + código (Salida no se aplica al CTA) | —
Sin insertos de "Animaciones de apoyo" | ninguna animación coincide literal con lo que dice Joseph (≥3 palabras seguidas, ≥2 con contenido) | assets.py con OCR vs. transcripción: mejor caso «me gustó» (2 palabras, clip 23 del piloto) | menos variedad visual; la foto y el gráfico cubren la densidad
Una foto del tema por clip (1,3 s, zoom 1,00→1,06), a ≥3 s del gráfico, del gancho y del cierre | densidad pedida sin assets seguidos | uso_assets.csv: 28 fotos, 0 repetidas | la foto tapa la cara 1,3 s mientras habla
Fotos al 65% del ancho, reescaladas una vez con lanczos a 702 px | las de 768 px se ven blandas más grandes; regla ≤70% | armar.py | —
Íconos de VS a 110 px (37% de la tarjeta de 300) y bordes de 8 px | regla: líneas ≥6 px (con la tarjeta achicada al 75% siguen ≥6) | Graficos.tsx | 37% < 40% en VS: más grande no entra con texto de 2 líneas
Escena del jarrón desde el primer golpe hasta 0,5 s después de romperse | el 09 duraba 7,6 s (regla ≤4 s) | plan del runner: «jarrón» 4,3 s → «rompe» 10,0 s | la frase «la confianza es como un jarrón» va sin dibujo
Caché de la transcripción y la cara por clip | ahorra ~4 min por clip en reintentos y re-renders | piloto: prep 3–5 min | —
Los 28 en una sola corrida en paralelo (20 a la vez) | pedido del usuario: más rápido; la prueba de 3 se cancela | GitHub permite 20 jobs simultáneos en repo público | si hay un error común, falla en varios a la vez (los reintentos son por clip)
Look de color por clip con ffmpeg (natural, cálido, frío, contraste, cine, dorado, mate), rotando por día | cada video distinto además del estilo de cámara | config/looks.json, probados con testsrc2 | el grano del look "cine" pide más bitrate (se dejó suave: alls=3)
Corte final también al silencio más cercano (snap) | 7 clips fallaron «palabra cortada» justo en el final: Joseph seguía hablando 0,3 s después | qa.md de 04, 05, 08, 13, 21, 30, 31 | el corte puede quedar hasta 0,3 s antes de lo previsto
Ningún gráfico antes del fin del gancho | en 05, 22 y 30 la tarjeta subía el video y el gancho quedaba sobre la cabeza (−209 px) | qa.md de 05, 22, 30 | el número de 22 y 30 entra ~2,7 s después de que lo dice
Tarjetas ≤ 6 s y nunca dentro del CTA | VS de 14–22 s (21, 27) y ecuación pisando el cierre (08) | validacion.json | —
Gancho hasta 64 px | «TU PUESTO IMPRESIONA 5 MINUTOS» no entraba en 2 líneas a 72 | 27: 3 líneas | gancho más chico que el subtítulo
Lista de 4 ítems: estilo compacto sin título | la de 4 preguntas medía 612 px y tapaba la cara (10: −21 px, 319 cuadros) | validacion.json de 10 | —
Distancia foto–gráfico medida en tiempo del clip | en tiempo de la fuente los cortes la achicaban (28: 0,9 s; 34: 0,1 s) | validacion.json | —
Se siguió después de pasar 600 min de Actions | el usuario pidió todo en paralelo sin frenar; repo público = sin costo | minutos.py: corrida de 28 = 1017 min (reintentos ×3) | —
Cortes: búsqueda de silencio en ±0,5 s (antes ±0,3) con un segundo umbral (piso +10 dB); el final solo hacia atrás | 04, 13, 21, 30, 31 seguían cortando con voz: Joseph encadena frases sin pausa | qa.md 2ª pasada | algún corte puede caer en una micro-pausa entre palabras
Fin del contenido antes de que empiece la palabra siguiente | whisper estira la última palabra sobre lo que sigue y se colaban «PODÉS» (08) e «Y SI QUERÉS» (31) | qa.md «Último subtítulo completo» | —
Gancho medido cuadro por cuadro (antes cada 2) | 05 y 22 fallaban en 1–2 cuadros sueltos | validacion.json | —
05 usa el gancho B «SÉ UN HOMBRE RESOLUTIVO» | el A (31 caracteres) no entraba arriba de la cabeza ni a 64 px | 05: bajada máxima 230 px y aun así no entraba | —
Silencio buscado en ventanas de 30 ms (antes 10 ms) | el corte caía en micro-huecos de 10 ms y el QA (30 ms) oía voz: 04, 05, 13 y 21 | qa.md 3ª pasada, ajustes de 4 ms | —
08 termina en «…sin generar la otra» y ningún gráfico tapa la última frase | la ecuación tapaba «podés…» y el último subtítulo no se veía | qa.md 08 | 08 dura ~3 s más
