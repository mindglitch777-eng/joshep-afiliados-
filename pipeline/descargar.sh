#!/usr/bin/env bash
# Descarga el video de $VIDEO_URL (nunca se imprime) a work/fuente.mp4. Drive → descarga directa; yt-dlp solo para dominios permitidos.
set -euo pipefail
mkdir -p work
OUT=work/fuente.mp4
if [[ "$VIDEO_URL" =~ drive\.google\.com|drive\.usercontent\.google\.com ]]; then
  ID=$(echo "$VIDEO_URL" | sed -nE 's#.*/d/([^/?]+).*#\1#p; s#.*[?&]id=([^&]+).*#\1#p' | head -1)
  echo "::add-mask::$ID"
  curl -sSL --fail -o "$OUT" "https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t"
else
  HOST=$(echo "$VIDEO_URL" | sed -E 's#^[a-z]+://([^/]+).*#\1#')
  if jq -e --arg h "$HOST" '.yt_dlp_permitidos | index($h)' config/pipeline.json >/dev/null; then
    pip install -q yt-dlp && yt-dlp -q -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "$OUT" "$VIDEO_URL"
  else
    curl -sSL --fail -o "$OUT" "$VIDEO_URL"
  fi
fi
if ! ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" >/dev/null 2>&1; then
  echo "::error::Lo descargado no es un video. En Drive: Compartir → 'Cualquier persona con el enlace'."
  exit 1
fi
echo "Descargado: $(du -h "$OUT" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | cut -d. -f1) s"
