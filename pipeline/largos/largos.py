"""Videos largos de Joseph → clips virales. Solo lectura de Drive ("Videos completos para editar"); nunca imprime IDs.
Etapas:
  inventario  $CARPETA=ID → largos/inventario.json (nombre, id, bytes) recorriendo subcarpetas
  analizar <n> $ACTIVOS    → largos/out/<n>/: palabras.json (whisper medium), info.json (silencios, energía, tamaño), candidatos.json/.csv
  extraer <n> <k> <t0> <t1> → piloto/activos/reel/<n>_<k>.mov: tramo con 1 s de margen, recortado a 9:16 si el video es horizontal
Puntaje de cada ventana de 25–55 s que empieza y termina en frase completa:
  gancho (frase 1: contraste/negación/pregunta/número/«si…», sin conectores ni referencias a algo anterior) · tema (palabras de
  atracción/citas) · consejo al final (imperativos) · energía de la voz respecto del video · ritmo (palabras/s) · autocontenido."""
import csv, json, os, re, subprocess, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
OUT = RAIZ / "largos"

def nrm(t):
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")

def sh(*a):
    return subprocess.run([str(x) for x in a], capture_output=True, text=True)

# ── inventario
def inventario():
    import catalogar
    pila, vids = [("", os.environ["CARPETA"])], []
    while pila:
        ruta, fid = pila.pop()
        for it in catalogar.listar(fid):
            nombre, iid, carpeta = it["nombre"], it["id"], it.get("carpeta")
            if carpeta:
                pila.append((f"{ruta}{nombre}/", iid))
            elif Path(nombre).suffix.lower() in {".mov", ".mp4", ".m4v", ".mkv", ".webm"}:
                vids.append({"n": f"L{len(vids) + 1:02d}", "nombre": ruta + nombre, "id": iid})
    OUT.mkdir(exist_ok=True)
    (OUT / "inventario.json").write_text(json.dumps(vids, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(vids)} videos largos")

# ── análisis
GANCHO = [r"\bno\b", r"\bnunca\b", r"\bjamas\b", r"\bnadie\b", r"\berror", r"\bproblema", r"\bsi\b", r"\bpor que\b", r"\?", r"\d",
          r"\bverdad\b", r"\bsecreto", r"\bdeja de\b", r"\bmientras\b", r"\bnecesitas\b", r"\bpara de\b"]
TEMA = r"atrac|mujer|chica|cita|seduc|confianza|segur|rechaz|chat|mensaje|invit|beso|ex\b|novia|pareja|coquete|interes|conquist|gust|hombre"
CONECTOR = r"^(y|entonces|pero|porque|o sea|osea|bueno|eso|esto|esa|ese|como te dije|como dije|lo que|tambien|ademas|ahi|despues)\b"
CONSEJO = r"\b(tenes que|tienes que|hace|hacé|proba|probá|nunca|siempre|aprende|deja|empeza|empezá|anima|recorda|acordate|pensa|elegi)\b"

def frases(ps):
    out, cur = [], []
    for i, p in enumerate(ps):
        cur.append(i)
        sig = ps[i + 1] if i + 1 < len(ps) else None
        if sig is None or re.search(r"[.?!]$", p["texto"]) or sig["desde"] - p["hasta"] > 0.7:
            out.append(cur)
            cur = []
    return out

def analizar(n):
    import numpy as np, wave
    inv = {v["n"]: v for v in json.loads((OUT / "inventario.json").read_text(encoding="utf-8"))}
    src = RAIZ / "largos" / "videos" / Path(inv[n]["nombre"]).name
    o = OUT / "out" / n
    o.mkdir(parents=True, exist_ok=True)
    wav = o / "audio.wav"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav)
    kw = json.loads((RAIZ / "config/keywords.json").read_text(encoding="utf-8"))
    sh(RAIZ / "whisper.cpp/build/bin/whisper-cli", "-m", RAIZ / "whisper.cpp/models/ggml-medium.bin", "-l", "es", "-t", str(os.cpu_count() or 4),
       "-ml", "1", "-sow", "-ojf", "-np", "--prompt", kw["vocabulario_whisper"] + " Vos, sos, querés, tenés.", "-f", wav, "-of", o / "whisper")
    ps = []
    for s in json.loads((o / "whisper.json").read_text(encoding="utf-8"))["transcription"]:
        t = s["text"].strip()
        if not t or t.startswith("["):
            continue
        if ps and all(not c.isalnum() for c in t):
            ps[-1]["texto"] += t
            continue
        ps.append({"i": len(ps), "texto": t, "desde": round(s["offsets"]["from"] / 1000, 3), "hasta": round(s["offsets"]["to"] / 1000, 3)})
    (o / "palabras.json").write_text(json.dumps(ps, ensure_ascii=False), encoding="utf-8")
    # energía por segundo (dB) para medir intensidad de cada ventana
    with wave.open(str(wav)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    seg = 16000
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + seg] ** 2)) + 1e-9) for i in range(0, len(x) - seg, seg)])
    voz = db[db > np.percentile(db, 30)]
    med, sd = float(np.median(voz)), float(np.std(voz) + 1e-6)
    pr = json.loads(sh("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_tags=rotate:format=duration", "-of", "json", src).stdout)
    st = pr["streams"][0]
    info = {"duracion": float(pr["format"]["duration"]), "ancho": st["width"], "alto": st["height"], "voz_db_mediana": med}
    (o / "info.json").write_text(json.dumps(info), encoding="utf-8")
    wav.unlink()
    # ventanas candidatas
    fr = frases(ps)
    cands = []
    for a in range(len(fr)):
        t0 = ps[fr[a][0]]["desde"]
        for b in range(a, len(fr)):
            t1 = ps[fr[b][-1]]["hasta"]
            d = t1 - t0
            if d > 55:
                break
            if d < 25 or not re.search(r"[.?!]$", ps[fr[b][-1]]["texto"]):
                continue
            txt = [" ".join(ps[i]["texto"] for i in f) for f in fr[a:b + 1]]
            f1, todo, fin = nrm(txt[0]), nrm(" ".join(txt)), nrm(txt[-1])
            dur1 = ps[fr[a][-1]]["hasta"] - t0
            g = sum(bool(re.search(r, f1)) for r in GANCHO) + (1.5 if dur1 <= 8 else 0) - (3 if re.match(CONECTOR, f1) else 0)
            tema = min(len(re.findall(TEMA, todo)) / max(d / 10, 1), 3)
            consejo = 1.5 if re.search(CONSEJO, fin) else 0
            e = db[int(t0):int(t1) + 1]
            energia = float(np.clip((np.mean(e[e > med - 10]) - med) / sd, -1.5, 1.5)) if len(e) else 0
            ritmo = min(len(todo.split()) / d / 2.6, 1.3)
            largo = 1 if 30 <= d <= 45 else 0
            score = round(2.0 * g + 1.5 * tema + consejo + 1.2 * energia + ritmo + largo, 2)
            cands.append({"desde": round(t0, 2), "hasta": round(t1, 2), "dur": round(d, 1), "score": score,
                          "gancho": round(g, 1), "tema": round(tema, 2), "consejo": consejo, "energia": round(energia, 2), "ritmo": round(ritmo, 2),
                          "primera": txt[0][:140], "texto": " ".join(txt)})
    # los mejores sin superponerse (≥ 5 s de distancia); hasta 1 por cada 4 min de video, máx. 12
    cands.sort(key=lambda c: -c["score"])
    tope = min(12, max(2, int(info["duracion"] / 240)))
    elegidos = []
    for c in cands:
        if all(c["hasta"] + 5 < e["desde"] or c["desde"] > e["hasta"] + 5 for e in elegidos):
            elegidos.append(c)
        if len(elegidos) >= tope:
            break
    for k, c in enumerate(sorted(elegidos, key=lambda c: c["desde"]), 1):
        c["k"] = f"{n}_{k:02d}"
    (o / "candidatos.json").write_text(json.dumps(elegidos, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(o / "candidatos.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, ["k", "desde", "hasta", "dur", "score", "gancho", "tema", "consejo", "energia", "ritmo", "primera", "texto"])
        w.writeheader()
        w.writerows(sorted(elegidos, key=lambda c: -c["score"]))
    print(f"{n}: {info['duracion'] / 60:.0f} min, {info['ancho']}x{info['alto']}, {len(ps)} palabras, {len(cands)} ventanas → {len(elegidos)} candidatos")

# ── extracción del tramo como "reel" (9:16)
def extraer(n, k, t0, t1):
    inv = {v["n"]: v for v in json.loads((OUT / "inventario.json").read_text(encoding="utf-8"))}
    src = RAIZ / "largos" / "videos" / Path(inv[n]["nombre"]).name
    a, b = max(0.0, float(t0) - 1.0), float(t1) + 1.0
    pr = json.loads(sh("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", src).stdout)["streams"][0]
    w, h = pr["width"], pr["height"]
    vf = "scale=1080:1920"
    if w * 16 > h * 9 + 1:  # horizontal o cuadrado: recorte 9:16 centrado en la cara (mediana de la detección cada 1 s)
        cx = centro_cara(src, a, b) * w
        cw = h * 9 / 16
        x = int(min(max(cx - cw / 2, 0), w - cw))
        vf = f"crop={int(cw)}:{h}:{x}:0,scale=1080:1920"
    dst = RAIZ / "piloto" / "activos" / "reel" / f"{k}.mov"
    dst.parent.mkdir(parents=True, exist_ok=True)
    sh("ffmpeg", "-y", "-loglevel", "error", "-ss", a, "-to", b, "-i", src, "-vf", vf, "-r", "30", "-c:v", "libx264", "-crf", "16", "-preset", "fast",
       "-c:a", "aac", "-b:a", "256k", dst)
    print(f"{k}: {b - a:.1f} s {'recortado 9:16' if 'crop' in vf else 'vertical'}")

def centro_cara(src, a, b):
    import cv2, mediapipe as mp
    cap = cv2.VideoCapture(str(src))
    det = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
    xs, t = [], a
    while t < b:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, fr = cap.read()
        if ok:
            r = det.process(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
            if r.detections:
                bb = max(r.detections, key=lambda d: d.location_data.relative_bounding_box.width).location_data.relative_bounding_box
                xs.append(bb.xmin + bb.width / 2)
        t += 1.0
    xs.sort()
    return xs[len(xs) // 2] if xs else 0.5

if __name__ == "__main__":
    e = sys.argv[1]
    if e == "inventario":
        inventario()
    elif e == "analizar":
        analizar(sys.argv[2])
    elif e == "extraer":
        extraer(*sys.argv[2:6])
