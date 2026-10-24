#!/usr/bin/env bash
# Sintetiza todos los SFX y la música con ffmpeg (obra propia → CC0) y mide cada uno → public/sfx/sfx.json.
set -e
cd "$(dirname "$0")/../public"
mkdir -p sfx music
rm -f sfx/*.mp3
E() { ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='$2':d=$3:s=44100" ${4:+-af "$4"} "sfx/$1.mp3"; }
N() { ffmpeg -y -loglevel error -f lavfi -i "anoisesrc=d=$2:c=$3:a=0.9" -af "$4" "sfx/$1.mp3"; }
# impactos
E boom    '0.9*sin(2*PI*(40*t+20*(1-exp(-4*t))))*exp(-3*t)+0.4*(random(0)-0.5)*exp(-60*t)' 1.0
E subhit  '0.9*sin(2*PI*50*t)*exp(-4*t)' 0.7
E stamp   '0.8*sin(2*PI*70*t)*exp(-14*t)+0.5*(random(0)-0.5)*exp(-45*t)' 0.3 'highpass=f=40'
E golpe   '0.8*sin(2*PI*90*t)*exp(-35*t)+0.4*(random(0)-0.5)*exp(-80*t)' 0.15
# movimiento
N riser   0.5  white 'highpass=f=1200,afade=t=in:d=0.48:curve=exp,volume=0.8'
N whoosh-a 0.3 pink  'bandpass=f=1500:width_type=h:w=1800,afade=t=in:d=0.15,afade=t=out:st=0.15:d=0.15,volume=2'
N whoosh-b 0.38 brown 'highpass=f=300,lowpass=f=3000,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.26,volume=2.5'
N swipe   0.15 white 'highpass=f=2500,afade=t=in:d=0.04,afade=t=out:st=0.05:d=0.1,volume=0.7'
# tonales
E ding    '0.5*(sin(2*PI*1318.5*t)+0.3*sin(2*PI*2637*t))*exp(-9*t)+if(gte(t,0.07),0.5*(sin(2*PI*1975.5*(t-0.07))+0.3*sin(2*PI*3951*(t-0.07)))*exp(-7*(t-0.07)),0)' 0.6
E exito   '0.35*(sin(2*PI*1046.5*t)*exp(-8*t)+if(gte(t,0.06),sin(2*PI*1318.5*(t-0.06))*exp(-8*(t-0.06)),0)+if(gte(t,0.12),sin(2*PI*1568*(t-0.12))*exp(-6*(t-0.12)),0))' 0.6
E tick    '0.6*sin(2*PI*1500*t)*exp(-60*t)' 0.08
E pop     '0.8*sin(2*PI*(900*t-2400*t*t))*exp(-25*t)' 0.18
E burbuja '0.7*sin(2*PI*(400*t+5000*t*t))*exp(-30*t)' 0.12
# flash de cámara: clic de obturador (2 golpes de ruido) + zap electrónico corto, pasa-bajos 8 kHz, ≤150 ms
E flash   '0.7*(random(0)-0.5)*exp(-400*t)+if(gte(t,0.035),0.5*(random(0)-0.5)*exp(-300*(t-0.035)),0)+0.35*sin(2*PI*(3200*t-9000*t*t))*exp(-22*t)' 0.14 'lowpass=f=8000'
# fades anti-click: 5 ms de entrada (no mata el ataque) y hasta 100 ms de salida
for f in sfx/*.mp3; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  set -- $(awk -v d="$d" 'BEGIN{x=d/2; if(x>0.1)x=0.1; printf "%.3f %.3f", x, d-x}')
  ffmpeg -y -loglevel error -i "$f" -af "afade=t=in:d=0.005,afade=t=out:st=$2:d=$1" "$f.tmp.mp3" && mv "$f.tmp.mp3" "$f"
done
# música: loop de 8s con acordes suaves (Am-F-C-G) + pulso
[ -f music/bg-loop.mp3 ] || ffmpeg -y -loglevel error -f lavfi -i "aevalsrc='0.12*(sin(2*PI*(220*if(lt(mod(t,8),2),1,if(lt(mod(t,8),4),0.794,if(lt(mod(t,8),6),1.189,0.891))))*t)+sin(2*PI*(330*if(lt(mod(t,8),2),1,if(lt(mod(t,8),4),0.794,if(lt(mod(t,8),6),1.189,0.891))))*t))*(0.6+0.4*exp(-mod(t,0.5)*6))':d=8:s=44100" -af "lowpass=f=1800" music/bg-loop.mp3
# medición: duración y RMS (dBFS) de cada archivo
{
  echo "{"
  for f in sfx/*.mp3 music/bg-loop.mp3; do
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
    r=$(ffmpeg -hide_banner -i "$f" -af volumedetect -f null - 2>&1 | sed -n 's/.*mean_volume: \(.*\) dB/\1/p')
    k=$(basename "$f" .mp3)
    echo "  \"$k\": {\"dur\": $d, \"rms\": $r},"
  done | sed '$ s/,$//'
  echo "}"
} > sfx/sfx.json
cat sfx/sfx.json
