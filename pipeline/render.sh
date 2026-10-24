#!/usr/bin/env bash
# Cara → arranque → plan (con gancho) → validación → render → master → cover + previews A/B/C → QA → entregables en salida/.
# Lo usan make-clip y render-clip.  Uso: pipeline/render.sh <nombre> <inicio_epoch>
set -euo pipefail
NOMBRE=$1; INICIO=$2
mkdir -p salida public/raw
# Face Mesh solo si falta (o si la caché es de antes de los landmarks)
if [ ! -f work/cara_base.json ] || ! grep -q '"ojos"' work/cara_base.json; then python pipeline/cara.py; fi
python pipeline/start_frame.py
python pipeline/plan.py "$NOMBRE"
npx tsx scripts/validar.ts work/plan.json work/validacion.json
cp work/cortado.mp4 public/raw/cortado.mp4
R="--browser-executable=${CHROMIUM:-} --log=error"; [ -z "${CHROMIUM:-}" ] && R="--log=error"
npx remotion render src/index.ts Clip work/render.mp4 --props=work/plan.json --crf 21 --concurrency=100% $R
bash scripts/master.sh work/render.mp4 salida/video.mp4
# portada: cuadro 0 con el gancho completo
npx remotion still src/index.ts Clip salida/cover.png --frame=0 --props=work/plan.json $R
# previews de 3 s, una por variante del gancho
PW=$(jq -r .salida.preview_ancho config/hook.json); PS=$(jq -r .salida.preview_segundos config/hook.json)
FPS=$(jq -r .fps work/plan.json)
for V in $(jq -r '.ganchos[].formula' work/plan.json); do
  jq --arg v "$V" '.ganchoVariante = $v' work/plan.json > work/plan-$V.json
  npx remotion render src/index.ts Clip salida/preview-$V.mp4 --props=work/plan-$V.json --frames=0-$((PS * FPS - 1)) --scale=$(python -c "print($PW/1080)") --crf 24 $R
done
python pipeline/qa.py salida/video.mp4 salida/qa.json "$INICIO"
python pipeline/post.py salida/post.md
cp work/plan.json salida/plan.json
# hoja de contactos 5x4 repartida en todo el clip
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 salida/video.mp4)
ffmpeg -y -loglevel error -i salida/video.mp4 -vf "fps=20/${DUR},scale=216:-1,tile=5x4:padding=4:color=black" -frames:v 1 salida/hoja.png
python pipeline/informe.py
echo "### Clip ${NOMBRE}" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
python -c "import json;q=json.load(open('salida/qa.json'));print(f\"- {q['minutos_corrida']} min · {q['audio']['lufs_integrado']} LUFS · TP {q['audio']['true_peak_dbtp']} · huecos {len(q['huecos_mayores_1_5s'])} · metas de solape {'OK' if q['metas_solape_ok'] else 'NO'}\")" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
