# Joseph afiliación — plantilla de clips

Plantilla Remotion 1080x1920 @30fps. Cada clip = un `plans/*.json` con qué pieza va en qué segundo y con qué textos.

**Piezas:** `gancho` · `comparacion` (✗ vs ✓) · `pasos` · `enfasis` · subtítulos con caja deslizante (palabras con `clave`, `tono`, `icono`).
Automático (`src/linea.ts`): planos cada 2–4 s con punch y motion blur, ningún tramo >1,5 s sin evento, sonido por evento (`src/sfx-map.ts`), música con ducking.

- Video fuente: ponerlo en `public/raw/` (gitignored, **nunca** se sube) y en el plan `"video": "raw/archivo.mp4"`.
- Muestras renderizadas: `samples/`.

```bash
npm i
npm run studio                     # previsualizar
npx remotion render src/index.ts Clip out/clip.mp4 --props=plans/ejemplo.json
```
