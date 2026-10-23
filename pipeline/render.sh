#!/usr/bin/env bash
# Plan → validación → render → master → QA → entregables en salida/. Lo usan make-clip y render-clip.
# Uso: pipeline/render.sh <nombre> <inicio_epoch>
set -euo pipefail
NOMBRE=$1; INICIO=$2
mkdir -p salida public/raw
python pipeline/plan.py "$NOMBRE"
npx tsx scripts/validar.ts work/plan.json work/validacion.json
cp work/cortado.mp4 public/raw/cortado.mp4
npx remotion render src/index.ts Clip work/render.mp4 --props=work/plan.json --crf 21 --concurrency=100% --log=error
bash scripts/master.sh work/render.mp4 salida/video.mp4
python pipeline/qa.py salida/video.mp4 salida/qa.json "$INICIO"
python pipeline/post.py salida/post.md
cp work/plan.json salida/plan.json
# hoja de contactos 5x4 repartida en todo el clip
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 salida/video.mp4)
ffmpeg -y -loglevel error -i salida/video.mp4 -vf "fps=20/${DUR},scale=216:-1,tile=5x4:padding=4:color=black" -frames:v 1 salida/hoja.png
# informe: análisis + encuadre + QA
python - <<'PY'
import json
qa = json.load(open("salida/qa.json")); plan = json.load(open("work/plan.json"))
L = [open("work/informe.md", encoding="utf-8").read(), "## Encuadre", f"- Video {plan['videoInfo']['ancho']}x{plan['videoInfo']['alto']} → modo **{plan['encuadre']}**, cara detectada en {qa['cara']['cobertura']*100:.0f}% de las muestras."]
L += [f"- ⚠ {a}" for a in qa["cara"]["avisos"]]
L += ["", "## Plan automático", *[f"- {p['tipo']} {p['desde']}–{p['hasta']} s: " + json.dumps({k: v for k, v in p.items() if k not in ('tipo', 'desde', 'hasta', 'tiempos')}, ensure_ascii=False) for p in plan["piezas"]],
      f"- {len(plan['cortes'])} jump cuts, {sum(1 for w in plan['subtitulos'] if w.get('clave'))} palabras clave",
      "", "## QA", f"- Audio: {qa['audio']['lufs_integrado']} LUFS, true peak {qa['audio']['true_peak_dbtp']} dBTP {'✅' if qa['audio']['ok'] else '⚠'}",
      f"- Tramos > 1.5 s sin evento: {len(qa['huecos_mayores_1_5s'])} · textos fuera de zona segura: {len(qa['textos_fuera_zona_segura'])}",
      *[f"- ⚠ {a}" for a in qa["avisos"]], f"- Minutos de Actions de esta corrida: **{qa['minutos_corrida']}**"]
open("salida/informe.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
PY
echo "### Clip ${NOMBRE}" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
python -c "import json;q=json.load(open('salida/qa.json'));print(f\"- {q['minutos_corrida']} min · {q['audio']['lufs_integrado']} LUFS · TP {q['audio']['true_peak_dbtp']} · huecos {len(q['huecos_mayores_1_5s'])}\")" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
