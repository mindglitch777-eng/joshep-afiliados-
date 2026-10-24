"""Cuadro 0 y arranque: la primera palabra a ≤ 0.15 s y el mejor cuadro inicial (cara, ojos abiertos, sin mano en la
boca, mirada a cámara). Recorta work/cortado_base.mp4 → work/cortado.mp4 y corre palabras, cortes y cara.
Uso: python pipeline/start_frame.py  → work/arranque.json + salida/candidatos/*.jpg"""
import wave
import cv2
import numpy as np
from comun import RAIZ, WORK, asegurar_base, cfg, guardar, leer, sh
from cara import analizar_frame

A = cfg("hook")["arranque"]

def inicio_voz():
    """Primer instante con voz plena (ignora murmullo bajo): RMS de 10 ms > mediana del habla − 10 dB, sostenido 60 ms."""
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", WORK / "cortado_base.mp4", "-t", "6", "-ac", "1", "-ar", "16000", WORK / "inicio.wav")
    with wave.open(str(WORK / "inicio.wav")) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    n = len(x) // 160
    db = 20 * np.log10(np.sqrt(np.mean(x[: n * 160].reshape(n, 160) ** 2, axis=1)) + 1e-9)
    umbral = np.median(db[db > -50]) - 10 if np.any(db > -50) else -35
    for i in range(n - 6):
        if np.all(db[i:i + 6] > umbral):
            return i * 0.01
    return 0.0

def puntaje(c):
    if not c:
        return -5.0, ["sin cara"]
    s, notas = 3.0, []
    if c["ear"] < 0.18:
        s -= 3; notas.append("parpadeo")
    else:
        s += 2
    if c["mano_boca"]:
        s -= 3; notas.append("mano sobre la boca")
    s += 2 * c["mirada"]
    if c["mirada"] < 0.6:
        notas.append("no mira a cámara")
    return s, notas or ["ok"]

def main():
    asegurar_base()
    voz = inicio_voz()
    cap = cv2.VideoCapture(str(WORK / "cortado_base.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    def cuadro(t):
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, round(t * fps)))
        ok, f = cap.read()
        return f if ok else None
    # 6 candidatos repartidos en ±0.6 s alrededor del arranque ideal (para el informe)
    ideal = max(0.0, voz - A["primera_palabra_max"])
    ts = [max(0.0, ideal - A["ventana"] + k * 2 * A["ventana"] / (A["candidatos"] - 1)) for k in range(A["candidatos"])]
    # elegibles: solo los que dejan la primera palabra a ≤ 0.15 s sin cortarla (se evalúa cuadro a cuadro)
    elegibles = sorted({max(0.0, ideal + k / fps) for k in range(int(A["primera_palabra_max"] * fps) + 1) if ideal + k / fps <= voz})
    out_dir = RAIZ / "salida" / "candidatos"
    out_dir.mkdir(parents=True, exist_ok=True)
    cands = []
    for k, t in enumerate(ts):
        f = cuadro(t)
        c, _ = analizar_frame(f) if f is not None else (None, 0)
        s, notas = puntaje(c)
        ok = voz - t <= A["primera_palabra_max"] + 1e-6 and t <= voz
        if f is not None:
            cv2.imwrite(str(out_dir / f"c{k + 1}.jpg"), cv2.resize(f, (216, int(216 * f.shape[0] / f.shape[1]))))
        cands.append({"n": k + 1, "t": round(t, 3), "puntaje": round(s, 2), "notas": notas, "cumple_015": ok})
    mejor = (None, -99)
    for t in elegibles:
        f = cuadro(t)
        s, _ = puntaje(analizar_frame(f)[0] if f is not None else None)
        if s > mejor[1]:
            mejor = (t, s)
    inicio = round(mejor[0] if mejor[0] is not None else ideal, 3)
    # recorte y corrimiento de tiempos
    sh("ffmpeg", "-y", "-loglevel", "error", "-ss", inicio, "-i", WORK / "cortado_base.mp4", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", WORK / "cortado.mp4")
    ps = [{**p, "desde": round(max(0, p["desde"] - inicio), 3), "hasta": round(p["hasta"] - inicio, 3)} for p in leer(WORK / "palabras_base.json") if p["hasta"] - inicio > 0.05]
    cb = leer(WORK / "cortes_base.json")
    cortes = {**cb, "cortes": [round(c - inicio, 3) for c in cb["cortes"] if c - inicio > 0.3], "duracion": round(cb["duracion"] - inicio, 3)}
    cara = [{**c, "t": round(c["t"] - inicio, 3)} for c in leer(WORK / "cara_base.json") if c["t"] - inicio >= -0.2]
    guardar(WORK / "palabras_clip.json", ps)
    guardar(WORK / "cortes.json", cortes)
    guardar(WORK / "cara.json", cara)
    guardar(WORK / "arranque.json", {"inicio_voz_base": round(voz, 3), "recorte": inicio, "primera_palabra": round(voz - inicio, 3),
                                     "puntaje_cuadro0": round(mejor[1], 2), "candidatos": cands})
    print(f"voz a {voz:.2f} s → recorte {inicio:.3f} s, primera palabra a {voz - inicio:.3f} s")

if __name__ == "__main__":
    main()
