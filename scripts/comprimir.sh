#!/usr/bin/env bash
# Comprime a ≤ 14 MB manteniendo 1080x1920 a 60 fps: x264 en 2 pasadas al bitrate que entra (audio del master copiado).
# Uso: scripts/comprimir.sh entrada.mp4 salida.mp4 [MB objetivo, 13.4]
set -e
IN="$1"; OUT="$2"; MB="${3:-13.4}"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
for intento in 1 2 3; do
  KB=$(python3 -c "print(int(($MB*8*1000*1000/$D - 160000)/1000))")
  P=$(mktemp -d)/x264
  ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -b:v ${KB}k -maxrate $((KB*2))k -bufsize $((KB*2))k -r 60 -pix_fmt yuv420p -pass 1 -passlogfile "$P" -an -f null /dev/null
  ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -b:v ${KB}k -maxrate $((KB*2))k -bufsize $((KB*2))k -r 60 -pix_fmt yuv420p -pass 2 -passlogfile "$P" -c:a copy -movflags +faststart "$OUT"
  S=$(stat -c %s "$OUT")
  echo "comprimido: $(python3 -c "print(round($S/1e6,2))") MB a ${KB} kbps"
  [ "$S" -le 14000000 ] && exit 0
  MB=$(python3 -c "print($MB*0.93)")
done
exit 1
