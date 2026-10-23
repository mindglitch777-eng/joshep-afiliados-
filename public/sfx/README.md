# Sonidos: origen y licencias

Todos los archivos son **sintetizados por código** con ffmpeg (`scripts/gen-sfx.sh`): obra propia, **CC0**.
No hay audio de terceros, nada de Pixabay y nada en tendencia de TikTok (esos se suman en la app).
Se regeneran con `npm run sfx`, que también reescribe `sfx.json` (duración y RMS medidos, usados para los niveles).

| Archivo | Uso (ver `src/sfx-map.ts`) | Cómo se hizo | Licencia |
|---|---|---|---|
| `boom.mp3` | gancho | sub-drop 60→40 Hz + golpe de ruido | CC0 (propio) |
| `riser.mp3` | entrada al primer corte | ruido blanco filtrado con fade exponencial | CC0 (propio) |
| `whoosh-a.mp3` / `whoosh-b.mp3` | cambio de plano (alternan) | ruido rosa/marrón pasabanda con envolvente | CC0 (propio) |
| `ding.mp3` | palabra clave: **motivo de marca** | 2 notas Mi6→Si6 con armónico | CC0 (propio) |
| `golpe.mp3` | tarjeta ✗ | senoidal 90 Hz + ruido, caída rápida | CC0 (propio) |
| `swipe.mp3` | tachado / aparece la lista | ruido blanco pasa-altos 0,15 s | CC0 (propio) |
| `exito.mp3` | tarjeta ✓ | arpegio Do6-Mi6-Sol6 | CC0 (propio) |
| `tick.mp3` + `pop.mp3` | ítem de lista | clic 1,5 kHz + blip con caída de tono | CC0 (propio) |
| `stamp.mp3` + `subhit.mp3` | etiqueta de énfasis | golpe 70 Hz + clic / sub 50 Hz | CC0 (propio) |
| `burbuja.mp3` | ícono | barrido 400→1200 Hz | CC0 (propio) |
| `../music/bg-loop.mp3` | música de fondo | acordes Am-F-C-G + pulso | CC0 (propio) |

Si se agrega un sonido de Freesound: **solo CC0**, con una fila acá (URL, autor, licencia, fecha).
