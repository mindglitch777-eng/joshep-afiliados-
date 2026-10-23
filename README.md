# Joseph afiliación — plantilla de clips

Plantilla Remotion 1080x1920 @30fps. Cada clip = un `plans/*.json` con qué pieza va en qué segundo y con qué textos.

**Piezas:** `gancho` · `comparacion` (✗ vs ✓) · `pasos` · `enfasis` (palabra + zoom a la cara) · subtítulos palabra por palabra.
Automático: whoosh + barrido en cada pieza, punch-in de zoom si hay >3s sin cambio, música baja en loop.

- Video fuente: ponerlo en `public/raw/` (gitignored, **nunca** se sube) y en el plan `"video": "raw/archivo.mp4"`.
- Muestras renderizadas: `samples/`.

```bash
npm i
npm run studio                     # previsualizar
npx remotion render src/index.ts Clip out/clip.mp4 --props=plans/ejemplo.json
```
