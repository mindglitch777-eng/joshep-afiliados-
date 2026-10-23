"""Recorta el clip elegido, saca silencios (> 0.4 s, deja 0.12 s de aire), procesa la voz y remapea tiempos.
Uso: python pipeline/cortar.py work/fuente.mp4  → work/cortado.mp4, work/palabras_clip.json, work/cortes.json"""
import re, sys
from comun import WORK, cfg, guardar, info_video, leer, sh

P = cfg("pipeline")
VOZ = "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-18dB:ratio=3:attack=10:release=150:makeup=2,loudnorm=I=-16:TP=-2:LRA=11"

def silencios(video, t0, t1):
    out = sh("ffmpeg", "-hide_banner", "-ss", t0, "-to", t1, "-i", video, "-af", f"silencedetect=noise=-35dB:d={P['silencio_min_s']}", "-f", "null", "-", capturar=True)
    ini = [float(x) + t0 for x in re.findall(r"silence_start: ([\d.]+)", out)]
    fin = [float(x) + t0 for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(ini, fin))

def main(video):
    el = leer(WORK / "analisis.json")["elegido"]
    t0, t1 = max(0.0, el["inicio"] - 0.15), el["fin"] + 0.35
    tramos = [(t0, t1)]
    if P["remove_silences"]:
        aire = P["aire_s"]
        tramos, a = [], t0
        for s, e in silencios(video, t0, t1):
            if e - s - 2 * aire <= 0.05:
                continue
            tramos.append((a, s + aire))
            a = e - aire
        tramos.append((a, t1))
        tramos = [(a, b) for a, b in tramos if b - a > 0.08]
    # mapa tiempo fuente → tiempo del clip cortado
    acum, mapa = 0.0, []
    for a, b in tramos:
        mapa.append((a, b, acum))
        acum += b - a
    def remap(t):
        for a, b, off in mapa:
            if t < a:
                return off
            if t <= b:
                return off + t - a
        return acum
    ps = [p for p in leer(WORK / "palabras.json") if t0 <= p["desde"] <= t1]
    clip = []
    for p in ps:
        d, h = remap(p["desde"]), remap(p["hasta"])
        if h - d > 0.02:
            clip.append({**p, "desde": round(d, 3), "hasta": round(h, 3)})
    cortes = [round(off, 3) for _, _, off in mapa[1:]]
    guardar(WORK / "palabras_clip.json", clip)
    guardar(WORK / "cortes.json", {"cortes": cortes, "tramos": tramos, "duracion": round(acum, 3)})
    # video: concat de tramos con fades de 10 ms a cada lado (crossfade de ~20 ms en cada corte)
    xf = P["crossfade_ms"] / 2000
    w, h = info_video(video)
    escala = "scale=-2:'min(1080,ih)'" if w > h else "scale='min(1080,iw)':-2"
    fc = []
    for i, (a, b) in enumerate(tramos):
        fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,{escala},setsar=1[v{i}]")
        fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d={xf},afade=t=out:st={max(b - a - xf, 0)}:d={xf}[a{i}]")
    fc.append("".join(f"[v{i}][a{i}]" for i in range(len(tramos))) + f"concat=n={len(tramos)}:v=1:a=1[v][a0]")
    fc.append(f"[a0]{VOZ}[a]")
    (WORK / "filtro.txt").write_text(";\n".join(fc))
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", video, "-filter_complex_script", WORK / "filtro.txt", "-map", "[v]", "-map", "[a]",
       "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", WORK / "cortado.mp4")
    print(f"{len(tramos)} tramos, {len(cortes)} jump cuts, {acum:.1f} s (antes {t1 - t0:.1f} s)")

if __name__ == "__main__":
    main(sys.argv[1])
