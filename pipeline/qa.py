"""qa.json final: validación del plan + loudness/picos del mp4 + minutos de la corrida.
Uso: python pipeline/qa.py video.mp4 salida/qa.json inicio_epoch"""
import re, sys, time
from comun import WORK, guardar, leer, sh

def main(video, salida, inicio):
    out = sh("ffmpeg", "-hide_banner", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-", capturar=True)
    resumen = out[out.rfind("Summary:"):]
    num = lambda k: float(re.search(rf"{k}:\s+(-?[\d.]+|-inf)", resumen).group(1).replace("-inf", "-99"))
    qa = leer(WORK / "validacion.json")
    qa["audio"] = {"lufs_integrado": num("I"), "lra": num("LRA"), "true_peak_dbtp": num("Peak"),
                   "ok": abs(num("I") + 14) <= 1 and num("Peak") <= -1}
    qa["cara"] = leer(WORK / "cara_info.json")
    qa["minutos_corrida"] = round((time.time() - float(inicio)) / 60, 1)
    guardar(salida, qa)
    print(f"LUFS {qa['audio']['lufs_integrado']} · TP {qa['audio']['true_peak_dbtp']} · {qa['minutos_corrida']} min")

if __name__ == "__main__":
    main(*sys.argv[1:4])
