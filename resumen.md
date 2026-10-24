# Misión 5 — Lote de 28 reels: resumen

**Resultado:** los 28 clips del lote (días 6 a 33) pasan todas las reglas de `qa.py`. 1080×1920 a 60 fps, −14 LUFS, pico ≤ −1,5 dBTP, 13,4–13,6 MB, duración final 38,5–48,6 s. Los 5 del piloto no se tocaron.

**Qué lleva cada clip:**
- Flash de arranque (+20% durante 4 cuadros).
- Gancho arriba de la cabeza, o detrás de Joseph en el estilo «capas».
- Un gráfico de su formato:
  - VS: 12 clips.
  - Lista: 8.
  - Número grande: 3.
  - Escena animada: 3 (jarrón, taza bajo la lluvia, grupo).
  - Ecuación: 2.
- Una foto de su tema durante 1,3 s con zoom lento (28 fotos distintas, ninguna repetida).
- Subtítulos con glosario y censura.
- Cierre con la animación de Joseph y su propio botón «Link en mi perfil», visible al menos 2 s.

**Variedad:**
- El estilo de cámara rota entre punch, push, capas y mano.
- El look de color (ffmpeg) rota entre natural, cálido, frío, contraste, cine, dorado y mate.
- Nunca se repite estilo, formato ni CTA en días seguidos.
- Densidad: 41–56 eventos visuales por minuto (está en `metricas.csv`), sin tramos de más de 8 s sin evento.

**Qué falló y cómo se arregló (detalle en `decisions.md`):**
- El chip amarillo del cierre tapaba el título: se sacó, porque los 13 CTA ya traen su botón.
- Cortes que dejaban un pedazo de palabra (8 clips): ahora el corte busca silencio en ventanas de 30 ms, la misma medida que usa el QA.
- Tarjetas durante el gancho, que empujaban el texto sobre la cabeza (05, 22, 30): ahora los gráficos empiezan después del gancho.
- Tarjetas VS de 14–22 s: ahora duran como máximo 6 s.
- Lista de 4 preguntas demasiado alta (10): pasó a estilo compacto.
- Foto pegada al gráfico (28, 34): ahora se separa al menos 3 s, medido en el tiempo del clip.
- En el 05 se usó el gancho B, porque el A no entraba arriba de la cabeza.

**No se hizo / riesgos:**
- **Insertos de «Animaciones de apoyo»:** ninguno. Ninguna animación coincide literalmente con lo que dice Joseph (OCR contra la transcripción).
- **Tamaño del gancho:** queda en 64–100 px, más chico que el subtítulo (92 px) en varios clips, para que entre arriba de la cabeza.
- **Botón de las animaciones:** está a unos 1540 px de alto, en la franja donde TikTok muestra la descripción.
- **Repo:** sigue público. No tiene videos, imágenes, IDs ni links.
- **Palabras dudosas de whisper (confianza < 60%):** 234 en total, listadas en `plans/dudosas.csv`. Hay que revisar sobre todo las de 24, 12, 22 y 04.

**Minutos de Actions:** 2.390 en total (sin costo: repo público).

| Corrida | Minutos | Nota |
|---|---|---|
| Prueba | 45 | |
| Ola 1 con las reglas viejas | 445 | cancelada |
| Lote de 28 | 1.017 | los reintentos ×3 lo inflaron |
| Arreglos | 309 + 473 + 93 | |

Un clip limpio tarda 10–17 min de job. El límite de 600 min se pasó porque se pidió todo en paralelo y sin frenar.

**Qué mejoraría:**
1. Validar los cortes con el mismo detector que el QA antes de renderizar. Ahorraría la mitad de los minutos.
2. Pedirle a Joseph ganchos de 2–4 palabras: entran grandes arriba de la cabeza.
3. Medir retención a 3 s por estilo y look en `metricas.csv`, y quedarse con los 2 mejores.
