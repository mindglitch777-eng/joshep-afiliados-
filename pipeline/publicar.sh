#!/usr/bin/env bash
# Entrega: Supabase (bucket PRIVADO, si hay secrets) y, si se pide, muestra chica + informe en la rama para revisarla desde el celular.
# Uso: pipeline/publicar.sh <nombre> <publicar_muestra:true|false>
set -euo pipefail
NOMBRE=$1; MUESTRA=$2
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_KEY:-}" ]; then
  H=(-H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -H "apikey: $SUPABASE_SERVICE_KEY")
  curl -s "${H[@]}" -H "Content-Type: application/json" -d '{"id":"clips","name":"clips","public":false}' "$SUPABASE_URL/storage/v1/bucket" >/dev/null || true
  for f in salida/*; do
    curl -sS --fail "${H[@]}" -H "x-upsert: true" --data-binary @"$f" "$SUPABASE_URL/storage/v1/object/clips/$NOMBRE/$(basename "$f")" >/dev/null && echo "Supabase: $(basename "$f")"
  done
else
  echo "Sin secrets de Supabase: solo artifact."
fi
if [ "$MUESTRA" = "true" ]; then
  mkdir -p "clips/$NOMBRE" samples
  cp salida/informe.md salida/qa.json salida/post.md salida/hoja.png salida/plan.json "clips/$NOMBRE/"
  # muestra chica para el celular (< ~8 MB)
  ffmpeg -y -loglevel error -i salida/video.mp4 -vf scale=720:-2 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k "samples/$NOMBRE.mp4"
  git config user.name "github-actions[bot]"; git config user.email "41898333+github-actions[bot]@users.noreply.github.com"
  git add "clips/$NOMBRE" "samples/$NOMBRE.mp4"
  git commit -qm "Clip $NOMBRE: muestra, informe, QA y post (generado por Actions)"
  for i in 1 2 3; do git pull -q --rebase origin "$GITHUB_REF_NAME" && git push -q origin "HEAD:$GITHUB_REF_NAME" && break; sleep $((i * 5)); done
fi
