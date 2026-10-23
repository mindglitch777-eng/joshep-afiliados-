# Changelog

## Misión 2 — primer clip real + uso sin Claude (`samples/joseph1.mp4`, `clips/joseph1/`)

**Flujo:** Actions → `make-clip` (link + nombre) → descarga (link enmascarado) → whisper.cpp small en español con vocabulario del nicho → análisis con puntaje y motivos → corte de silencios + voz → seguimiento de cara → plan por reglas + `plan.override.json` → validador → render → master → QA → artifact de 3 días, Supabase privado (si hay secrets) y, opcional, muestra en la rama. `render-clip` re-renderiza desde la caché sin transcribir de nuevo.

| Punto | Qué quedó |
|---|---|
| 1 Workflows | `make-clip.yml` y `render-clip.yml`; URL leída del evento y `::add-mask::` (nunca interpolada); caché de whisper.cpp+modelo y del análisis por clip |
| 2 Encuadre | vertical: como está; horizontal: recorte 9:16 que sigue la cara (o `desenfocado`); MediaPipe a 6 muestras/s, mayor cara con continuidad, EMA; sin cara → centrado + aviso |
| 3 Silencios | `silencedetect` > 0,4 s, 0,12 s de aire, fades de 10+10 ms (20 ms), timestamps/cara/plan remapeados, micro-zoom 4% en cada jump cut; `remove_silences` en `config/pipeline.json` |
| 4 Voz | highpass 80 Hz, afftdn, compresor 3:1, -16 LUFS antes de mezclar; master final **-14,0 LUFS / -1,5 dBTP** |
| 5 Informe | top con puntaje (gancho, impacto, pausas, energía, relleno, estructura), frases que lo dispararon, motivo de descarte de cada uno, palabras con confianza < 50% |
| 6 Plan | gancho = frase más fuerte; comparación ("no se trata de X, se trata de Y", "en vez de", "no X sino Y"); listas (ordinales o "por ejemplo/como A, B, C"); énfasis e íconos por diccionario; override encima (las correcciones de palabras se aplican antes de detectar) |
| 7 Subtítulos | nunca terminan línea en artículo/preposición/conjunción (lista en `config/keywords.json`); corte en pausa ≥ 0,25 s o puntuación; la palabra activa pasa a negro solo cuando la caja llegó |
| 8 Config | `config/brand.json`, `keywords.json`, `sfx.json`, `pipeline.json` |
| 9 Entregables | `video.mp4`, `informe.md`, `post.md`, `qa.json`, `hoja.png`, `plan.json` |
| 10 Uso | `README-USO.md` |

**Minutos de Actions** (repo público → gratis): make-clip **12,7 min** (whisper compilado de cero; con caché ≈ 11); render-clip **31,7 min**, de los cuales 22 fueron un `apt-get` lento → ahora se saltea si ffmpeg ya está (≈ 10 min esperados).

**Lo que no se cumplió exacto:**
- Desde la sesión de Claude no se pudo bajar el video ni el modelo (Drive y Hugging Face bloqueados por la red del entorno): todo corrió en Actions.
- "La cara que habla" se aproxima con la cara más grande y continuidad (MediaPipe no da quién habla).
- Los títulos de `post.md` salen de plantillas, no de un modelo de lenguaje (gratis y sin keys).

## v3 — fluida y con identidad (`samples/muestra-mision1-v3.mp4` + `-hoja.png`)

Se conserva de la v2: Montserrat, nada tocando bordes, tarjetas fuera de la cara, sin destello blanco, master a -14 LUFS.
**Una sola línea de tiempo** (`src/linea.ts`) calcula planos, eventos y sonidos; el render y el reporte salen de ahí.

| Punto | Antes (v2, medido) | Después (v3) |
|---|---|---|
| P1-A Cámara | casi estática, un solo zoom (~14,4 s) | 13 planos: push-in 1.00→1.10 y abierto 1.06 con reencuadre ±3%, alternados; cambio de plano = punch de 9 frames con `bezier(0.22,1,0.36,1)` + golpe de escala 3%; énfasis 1.18 |
| P1-A Motion blur | no | `@remotion/motion-blur`, 4 muestras, solo durante los punch |
| P1-A Ritmo | tramos sin cambio en 4 s, 7 s, 12–13 s, 16–19 s | **tramo máx. 1,47 s** (límite 1,5); 26 eventos visuales, todos con sonido. Sin `Math.round` en transforms |
| P1-B Subtítulos | ~64 px, espaciado variable | 92 px (claves 115 px), gap 0.32em, +0.015em, line-height 1.2, ≤3 palabras por línea, ≤2 líneas, ≤856 px; posiciones calculadas con anchos reales de Montserrat (kerning apagado) |
| P1-B Firma | palabra amarilla que escalaba | caja amarilla única #FFD60A (radio 18, padding 6×16) que **desliza** con spring en 6 frames; texto negro al llegar; claves crecen 0.8→1 dentro de su ancho reservado; negativas #FF3B4E, positivas #2DE38B |
| P1-B Test | — | `scripts/test-subs.ts` (Chromium real): Δ ancho palabra **0,00 px**, Δ línea **0,00 px**, layout vs navegador **0,50 px**, 0 solapes |
| P2-A Capas | — | contraste +8%, saturación +10%, viñeta suave, barra de progreso 4 px a y=40; stickers de 160 px al lado de la cara cada ≥3 s; 10 íconos SVG propios (CC0) |
| P2-B Tarjetas | vidrio oscuro, 46 px | blancas 96%, texto negro 58 px, sombra 0 12px 40px .35, insignias ✗/✓, 920 px; lista igual (52 px, título 68 px); etiqueta amarilla sólida con stamp 1.15→1.0 |
| P3 Sonidos | 3 eventos en 20 s | **31 sonidos** con `src/sfx-map.ts`; 13 SFX sintetizados (CC0); máx. 2 simultáneos (recorta el más viejo con fade); impactos -8 dB y resto -14 dB respecto de la voz, música -24 dB con ducking |
| Master | -14,3 LUFS, pico -1,0 | **-14,8 LUFS, pico -1,2 dB** (objetivo TP -1,5 para margen del AAC) |

Reportes: `samples/reporte-ritmo-v3.md` (+ `.json`) y `samples/test-espaciado-v3.md`.
Comandos: `npx tsx scripts/ritmo.ts plans/X.json out.md` · `npx tsx scripts/test-subs.ts plans/X.json out.md`.

**Lo que no se cumplió exacto:**
- Subtítulos a 856 px de ancho máx. y no 880, para respetar la zona segura derecha de 160 px.
- Algunos planos duran menos de 2 s: la regla de 1,5 s manda y agrega cortes donde no hay otro evento.
- Antes de decirse, la palabra clave ocupa su ancho a 1.25x: el hueco alrededor se ve un poco más grande (es lo que garantiza que nada se mueva).
- El render a 60 fps pasó de 6 a 14 min por el motion blur (el mp4 sigue en 4,8 MB).
- La voz sigue sin probarse: no hay video real de Joseph, y los niveles se calcularon contra una voz de referencia de -20 dBFS RMS.

## v2 — Misión 1 premium (`samples/muestra-mision1-v2.mp4` + `-hoja.png`)

**Movimiento:** 2 curvas fijas en `src/theme.ts`: ENTRADA = `spring({damping:200})`, ACENTO = `spring({damping:14, stiffness:170})` con rebote recortado a 4%. Salidas: 7 frames de fade + scale 0.97. Revisado: 0 `transition:` en `src/`.
**FPS:** prueba 60 vs 30 → render 367 s vs 192 s (1,9x) y 4,9 MB vs 4,0 MB → se queda en **60 fps** (configurable con `"fps"` en el plan).

| Punto | Antes (v1) | Después (v2) |
|---|---|---|
| P1-A Zoom | salto a 1,6x en ~0,2 s con transform-origin | push-in continuo 1.00→1.06 por plano; énfasis 1.18 en 21 frames con `bezier(0.22,1,0.36,1)`, vuelve en 13; arranca 4 frames antes junto al impacto; cara a (50%, 38%) con translate+scale, limitado para que no haya bordes |
| P1-A face_track | no existía | `cara: [{t,x,y,w,h}]` en el plan: interpolación entre muestras + EMA α=0.15 + mantiene la última posición válida (`src/camara.ts`) |
| P1-B Tipografía | fuente del sistema, sin negrita | Montserrat 800/900 local (OFL) con `delayRender`; MAYÚS, -0.01em, line-height 1.05; contorno 7–8 px + sombra 2 capas; scrim 0→50% en el 40% inferior |
| P1-C Subtítulos | ventana de 3 palabras, cortes raros, espacios dobles | frases de 3–5 palabras cortadas en silencio >0,25 s / puntuación, tramos largos repartidos parejo; activa #FFD60A + escala 1.12 en 4 frames, adelantada 2 frames; entrada 6 frames (12→0 px), salida 3; y=1230, 80 px, ancho 856 px |
| P2-A Gancho | overshoot tocaba bordes; frame 0 vacío | caja 880 px, 100 px, palabra por palabra (stagger 3), ACENTO ≤4%; frame 0 ya con texto; salida fade+slide |
| P2-B Tarjeta | tapaba la cara, translúcida | debajo de la cara (+40 px), vidrio oscuro 88%, 150 px de alto, texto 46 px; ✗ desde la izquierda, tachado dibujado, ✓ 8 frames después con pop; subtítulos ocultos |
| P2-C Lista | se cortaba en el borde | tarjeta de vidrio debajo de la cara, márgenes 64 px, número en columna de 72 px, título 64 px, ítems 50 px; cada ítem entra en su timestamp (`tiempos`) |
| P2-D Énfasis | se cortaba en el pico | máx. 900 px en el pico, -3°, ACENTO, sobre la frente, en sync con el impacto |
| P3-A Transición | destello blanco de ~1 s | brillo en los bordes (máx. 0.25, screen, sin tapar la cara) + punch de +4% en 8 frames, solo en `transiciones` del plan |
| P3-B Audio | −22,6 LUFS, LRA 17,4, pico −3,6 | master 2 pasadas (`scripts/master.sh`, `-c:v copy`): **−14,3 LUFS, LRA 4,1, pico −1,0 dBTP**; música −24 dB bajo la voz con ducking +6 dB sin voz; SFX ≈ −15 dB (`src/audio.ts`) |

**Lo que no se cumplió exacto:**
- Tarjetas a 856 px, no 920: con 920 se pisa la zona segura derecha (160 px).
- Fades de SFX: 5 ms de entrada (con 100 ms el impacto y el tick pierden el golpe) y hasta 100 ms de salida.
- Subtítulos: gap de 14 px + un margen por palabra para el pop; sin eso el 1.12 pegaba las palabras.
- La muestra no tiene voz: el −14 LUFS sube la música y los SFX, así que su nivel absoluto se juzga recién con voz real.
- face_track no se probó con video real: falta un clip corto de Joseph (no se sube al repo).
