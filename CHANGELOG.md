# Changelog

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
