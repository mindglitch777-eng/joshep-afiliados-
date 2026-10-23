# Cómo usarlo desde el celular

## 1. Hacer un clip
1. En Drive: el video → **Compartir → Cualquier persona con el enlace** → copiar link.
2. App de GitHub (o github.com en el navegador) → este repo → **Actions → make-clip → Run workflow**.
3. Elegí la rama de trabajo, pegá el link en `video_url` y poné un `nombre` sin espacios (ej. `confianza1`).
   - `clip_start` / `clip_end` (segundos): opcionales. Vacíos = elige solo el mejor momento de 20–40 s.
   - `publicar_muestra`: tildalo si querés ver una versión chica en `samples/` del repo.
4. Esperá (≈ 25–45 min la primera vez). Al terminar: abrí la corrida → **Artifacts → clip-<nombre>** (se borra a los 3 días).
   Adentro: `video.mp4`, `informe.md` (por qué eligió ese momento), `post.md` (títulos + hashtags + aviso de afiliado), `qa.json`, `hoja.png`, `plan.json`.

El link nunca queda guardado: se enmascara en los logs y no se commitea.

## 2. Corregir algo sin tocar código
Creá o editá **`clips/<nombre>/plan.override.json`** (en la app: repo → archivo → ✏️). Se aplica encima del plan automático; regenerar nunca lo pisa.

```json
{
  "palabras": {"12": {"texto": "química"}},
  "quitar_piezas": ["enfasis"],
  "agregar_piezas": [{"tipo": "comparacion", "desde": 6.2, "hasta": 8.8, "mal": "Pedir permiso", "bien": "Tomar la iniciativa"}],
  "encuadre": "desenfocado"
}
```
- `palabras`: corrige una palabra del subtítulo por su número (míralo en `plan.json`). También sirve `{"clave": true}`, `{"tono": "pos"}` o `{"icono": "fuego"}`.
- `quitar_piezas`: por tipo (`gancho`, `comparacion`, `pasos`, `enfasis`) o por número.
- `agregar_piezas`: piezas nuevas con sus segundos (tiempo del clip ya cortado).
- Cualquier otra clave reemplaza la del plan (ej. `encuadre`).

## 3. Re-renderizar (sin volver a transcribir)
**Actions → render-clip → Run workflow** con el mismo `nombre`. Tarda solo el render (≈ 15–25 min).

## 4. Ajustes de marca (todo JSON)
- `config/brand.json`: colores, tamaños, fps, límites de caracteres.
- `config/keywords.json`: palabras de impacto, positivas, negativas, íconos, vocabulario para Whisper, palabras con las que no se corta un subtítulo.
- `config/sfx.json`: niveles (dB respecto de la voz) y qué sonido va con cada evento.
- `config/pipeline.json`: `remove_silences`, pausa mínima, aire, encuadre (`cara` / `desenfocado`), duración del clip.

## Supabase (opcional)
Repo → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`. Los clips se suben a un bucket **privado** `clips/`.
