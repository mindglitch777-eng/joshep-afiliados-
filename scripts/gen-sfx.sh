#!/usr/bin/env bash
# Genera los SFX y la música base sintetizados con ffmpeg (obra propia → CC0).
set -e
cd "$(dirname "$0")/../public"
F="ffmpeg -y -loglevel error"
# whoosh: ruido rosa con barrido de filtro y fade in/out
$F -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.9" -af "highpass=f=300,lowpass=f=4000,afade=t=in:d=0.3,afade=t=out:st=0.3:d=0.3,volume=1.4" sfx/whoosh.mp3
# impact: sub-grave con caída + golpe de ruido
$F -f lavfi -i "aevalsrc='0.9*sin(2*PI*(55+120*exp(-t*18))*t)*exp(-t*5)+0.5*(random(0)-0.5)*exp(-t*30)':d=1.0:s=44100" sfx/impact.mp3
# pop: blip corto con caída de tono
$F -f lavfi -i "aevalsrc='0.8*sin(2*PI*(900-600*t*8)*t)*exp(-t*25)':d=0.18:s=44100" sfx/pop.mp3
# tick: para cada paso de la lista
$F -f lavfi -i "aevalsrc='0.6*sin(2*PI*1500*t)*exp(-t*60)':d=0.08:s=44100" sfx/tick.mp3
# música: loop de 8s con acordes suaves (Am-F-C-G) + pulso
$F -f lavfi -i "aevalsrc='0.12*(sin(2*PI*(220*if(lt(mod(t,8),2),1,if(lt(mod(t,8),4),0.794,if(lt(mod(t,8),6),1.189,0.891))))*t)+sin(2*PI*(330*if(lt(mod(t,8),2),1,if(lt(mod(t,8),4),0.794,if(lt(mod(t,8),6),1.189,0.891))))*t))*(0.6+0.4*exp(-mod(t,0.5)*6))':d=8:s=44100" -af "lowpass=f=1800,afade=t=in:d=0.05" music/bg-loop.mp3
ls -la sfx music
