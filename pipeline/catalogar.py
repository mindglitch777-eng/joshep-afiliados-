"""Catálogo del material de Drive (solo lectura: no edita ni publica nada).
Etapas:  inventario  → cat/fuentes.csv (recorre carpetas compartidas por link, sin API key)
         descargar   → cat/bajados/... (reels, animaciones, imágenes y documentos)
         analizar    → cat/catalogo.csv, animaciones.csv, imagenes.csv, cruce.csv, docs/*.txt, hojas/*.jpg, datos.md
Uso: python pipeline/catalogar.py <etapa>   (las carpetas raíz llegan en $CARPETAS: "Nombre=ID;Nombre=ID")
Nunca imprime IDs ni links."""
import csv, difflib, html, json, os, re, subprocess, sys, unicodedata
from pathlib import Path
from urllib.request import Request, urlopen

RAIZ = Path(__file__).resolve().parent.parent
CAT = RAIZ / "cat"
UA = {"User-Agent": "Mozilla/5.0"}
SALTEAR = re.compile(r"completos", re.I)  # nunca tocar "Videos completos para editar"
VIDEO = {".mov", ".mp4", ".m4v", ".webm", ".mkv"}
IMAGEN = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
DOC = {".pdf", ".txt", ".docx", ".doc", ".md"}

def get(url):
    return urlopen(Request(url, headers=UA), timeout=60).read()

def sh(*a):
    return subprocess.run([str(x) for x in a], capture_output=True, text=True).stdout

def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in t if unicodedata.category(c) != "Mn"))

# ── 1. Inventario ────────────────────────────────────────────────────────────
def listar(fid):
    """Entradas de una carpeta compartida por link (vista embebida pública de Drive)."""
    h = get(f"https://drive.google.com/embeddedfolderview?id={fid}").decode("utf-8", "replace")
    out = []
    for m in re.finditer(r'<div class="flip-entry" id="entry-([\w-]+)".*?<a href="([^"]+)".*?flip-entry-title">(.*?)</div>(.*?)</a>', h, re.S):
        eid, href, titulo, resto = m.groups()
        fecha = re.search(r'flip-entry-last-modified"><div>(.*?)</div>', resto)
        out.append({"id": eid, "nombre": html.unescape(titulo).strip(), "carpeta": "/drive/folders/" in href,
                    "gdoc": "docs.google.com/document" in href, "fecha": fecha.group(1) if fecha else ""})
    return out

def inventario():
    CAT.mkdir(exist_ok=True)
    filas = []
    def recorrer(fid, ruta, raiz):
        for e in listar(fid):
            r = f"{ruta}/{e['nombre']}"
            if e["carpeta"]:
                if SALTEAR.search(e["nombre"]):
                    continue
                filas.append({**e, "ruta": r, "raiz": raiz, "tipo": "carpeta"})
                recorrer(e["id"], r, raiz)
            else:
                ext = Path(e["nombre"]).suffix.lower()
                tipo = "gdoc" if e["gdoc"] else "video" if ext in VIDEO else "imagen" if ext in IMAGEN else "documento" if ext in DOC else "otro"
                filas.append({**e, "ruta": r, "raiz": raiz, "tipo": tipo})
    for par in os.environ["CARPETAS"].split(";"):
        nombre, fid = par.split("=", 1)
        recorrer(fid.strip(), nombre.strip(), nombre.strip())
    with open(CAT / "fuentes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["raiz", "ruta", "nombre", "tipo", "id", "fecha", "bytes"], extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)
    print("inventario:", {t: sum(f["tipo"] == t for f in filas) for t in sorted({f["tipo"] for f in filas})})

# ── 2. Descarga ──────────────────────────────────────────────────────────────
def descargar():
    filas = list(csv.DictReader(open(CAT / "fuentes.csv", encoding="utf-8")))
    for f in filas:
        if f["tipo"] in ("carpeta", "otro"):
            continue
        dest = CAT / "bajados" / f["ruta"].lstrip("/")
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            if f["tipo"] == "gdoc":
                dest = dest.with_suffix(".txt")
                dest.write_bytes(get(f"https://docs.google.com/document/d/{f['id']}/export?format=txt"))
            elif not dest.exists():
                dest.write_bytes(get(f"https://drive.usercontent.google.com/download?id={f['id']}&export=download&confirm=t"))
            f["bytes"] = dest.stat().st_size
            f["local"] = str(dest.relative_to(CAT))
        except Exception as e:  # noqa: BLE001
            f["bytes"], f["local"] = "", ""
            print("no se pudo bajar:", f["ruta"], type(e).__name__)
    with open(CAT / "fuentes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["raiz", "ruta", "nombre", "tipo", "id", "fecha", "bytes", "local"], extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)
    print("descargados:", sum(1 for f in filas if f.get("local")))

# ── 3. Análisis ──────────────────────────────────────────────────────────────
def probe(p):
    j = json.loads(sh("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", p) or "{}")
    v = next((s for s in j.get("streams", []) if s["codec_type"] == "video"), {})
    a = next((s for s in j.get("streams", []) if s["codec_type"] == "audio"), None)
    w, h = v.get("width", 0), v.get("height", 0)
    rot = abs(int(next((d.get("rotation", 0) for d in v.get("side_data_list", []) if "rotation" in d), v.get("tags", {}).get("rotate", 0)) or 0))
    if rot in (90, 270):
        w, h = h, w
    fps = v.get("avg_frame_rate", "0/1").split("/")
    return {"ancho": w, "alto": h, "fps": round(int(fps[0]) / max(int(fps[1]), 1), 2), "dur": round(float(j.get("format", {}).get("duration", 0) or 0), 2),
            "audio": a is not None, "pix_fmt": v.get("pix_fmt", ""), "codec": v.get("codec_name", "")}

def loudness(p):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = o[o.rfind("Summary:"):]
    g = lambda k: (re.search(rf"{k}:\s+(-?[\d.]+)", s) or [None, ""])[1]
    return g("I"), g("Peak")

def hoja(p, salida, cols=3, filas=2, ancho=160):
    d = probe(p)["dur"] or 1
    n = cols * filas
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", p, "-vf", f"fps={n}/{d},scale={ancho}:-2,tile={cols}x{filas}:padding=2", "-frames:v", "1", "-q:v", "5", salida)

def texto_quemado(p, dur):
    """Texto en pantalla: OCR (tesseract) en 3 cuadros; cuenta palabras reales con confianza ≥ 70."""
    hall = []
    for k in (0.25, 0.5, 0.75):
        img = CAT / "tmp_ocr.png"
        sh("ffmpeg", "-y", "-loglevel", "error", "-ss", dur * k, "-i", p, "-frames:v", "1", "-vf", "scale=720:-2", img)
        tsv = sh("tesseract", img, "-", "-l", "spa", "--psm", "11", "tsv")
        for l in tsv.splitlines()[1:]:
            c = l.split("\t")
            if len(c) == 12 and c[11].strip() and float(c[10]) >= 70 and len(re.sub(r"\W", "", c[11])) >= 3:
                hall.append(c[11].strip())
    return " ".join(dict.fromkeys(hall))[:80]

def whisper(p):
    wav = CAT / "tmp.wav"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", p, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav)
    kw = json.loads((RAIZ / "config" / "keywords.json").read_text(encoding="utf-8"))
    sh(RAIZ / "whisper.cpp/build/bin/whisper-cli", "-m", RAIZ / "whisper.cpp/models/ggml-small.bin", "-l", "es", "-t", os.cpu_count(), "-np",
       "-ojf", "--prompt", kw["vocabulario_whisper"], "-f", wav, "-of", CAT / "tmp_w")
    try:
        segs = json.loads((CAT / "tmp_w.json").read_text(encoding="utf-8"))["transcription"]
    except Exception:  # noqa: BLE001
        return "", 0.0
    txt = " ".join(s["text"].strip() for s in segs).strip()
    ps = [t["p"] for s in segs for t in s.get("tokens", []) if not t["text"].startswith("[")]
    return txt, round(sum(ps) / len(ps), 3) if ps else 0.0

def ahash(p, t):
    """Hash perceptual (8x8) de un cuadro: para detectar reels repetidos."""
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t), "-i", str(p), "-frames:v", "1", "-vf", "scale=8:8,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    if len(raw) < 64:
        return 0
    m = sum(raw) / 64
    return sum(1 << i for i, b in enumerate(raw[:64]) if b > m)

def fondo(p, d):
    """Tipo de fondo de una animación: transparente (canal alfa), negro, verde u otro (bordes del cuadro)."""
    if re.search(r"yuva|rgba|argb|bgra|abgr|gbrap|^ya", d["pix_fmt"]):
        return "transparente"
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(min(0.5, d["dur"] / 2)), "-i", str(p), "-frames:v", "1", "-vf", "scale=32:32", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    if len(raw) < 32 * 32 * 3:
        return "?"
    px = [raw[i:i + 3] for i in range(0, len(raw), 3)]
    borde = [px[i] for i in range(1024) if i < 32 or i >= 992 or i % 32 in (0, 31)]
    r, g, b = (sum(c[k] for c in borde) / len(borde) for k in range(3))
    if max(r, g, b) < 30:
        return "negro"
    if g > 120 and r < 110 and b < 110:
        return "verde"
    if min(r, g, b) > 225:
        return "blanco"
    return f"otro rgb({r:.0f},{g:.0f},{b:.0f})"

def png_alfa(p):
    from PIL import Image
    im = Image.open(p)
    if im.mode in ("RGBA", "LA") or "transparency" in im.info:
        a = im.convert("RGBA").getchannel("A")
        return im.size, a.getextrema()[0] < 255
    return im.size, False

FUNCIONES = [("cierre/invitación", r"invit|cierre|link|bio|segui|descarg|cta"), ("libro", r"libro"), ("guía", r"guia"),
             ("empezá hoy", r"empez|hoy|ahora|comenz"), ("práctica", r"practic|ejercic")]

def palabras(t):
    stop = set("de la el los las un una y o en que con por para se te tu mi a al del es no si como mas muy lo le me nos su sus esto esta este eso".split())
    return {w for w in norm(t).split() if len(w) > 3 and w not in stop}

def analizar():
    filas = list(csv.DictReader(open(CAT / "fuentes.csv", encoding="utf-8")))
    loc = lambda f: CAT / f["local"] if f.get("local") else None
    (CAT / "hojas").mkdir(exist_ok=True)
    (CAT / "docs").mkdir(exist_ok=True)
    kw = json.loads((RAIZ / "config" / "keywords.json").read_text(encoding="utf-8"))
    # temas: subcarpetas (de cualquier raíz) + nombres de animaciones e imágenes
    temas = sorted({f["nombre"] for f in filas if f["tipo"] == "carpeta"})
    # documentos: texto completo
    for f in filas:
        p = loc(f)
        if not p or f["tipo"] not in ("documento", "gdoc"):
            continue
        dst = CAT / "docs" / (re.sub(r"\W+", "_", f["ruta"]).strip("_") + ".txt")
        if p.suffix.lower() == ".pdf":
            sh("pdftotext", "-layout", p, dst)
        elif p.suffix.lower() == ".docx":
            sh("pandoc", p, "-t", "plain", "-o", dst)
        else:
            dst.write_bytes(p.read_bytes())
    # animaciones
    anims = []
    for f in filas:
        p = loc(f)
        if p and f["tipo"] == "video" and not f["raiz"].lower().startswith("reels"):
            d = probe(p)
            n = norm(f["nombre"])
            func = next((k for k, rx in FUNCIONES if re.search(rx, n)), "otra")
            anims.append({"raiz": f["raiz"], "ruta": f["ruta"], "nombre": f["nombre"], "dur": d["dur"], "dim": f"{d['ancho']}x{d['alto']}", "fps": d["fps"],
                          "fondo": fondo(p, d), "audio": "sí" if d["audio"] else "no", "funcion": func, "pix_fmt": d["pix_fmt"]})
            hoja(p, CAT / "hojas" / f"anim_{len(anims):02d}.jpg", 3, 1, 120)
    # hoja de todas las animaciones juntas (1 cuadro del medio de cada una)
    lst = []
    for i, a in enumerate(anims, 1):
        fr = CAT / "hojas" / f"am_{i:02d}.jpg"
        sh("ffmpeg", "-y", "-loglevel", "error", "-ss", a["dur"] / 2, "-i", CAT / "bajados" / a["ruta"].lstrip("/"), "-frames:v", "1", "-vf",
           f"scale=180:180:force_original_aspect_ratio=decrease,pad=180:180:(ow-iw)/2:(oh-ih)/2:color=gray,drawtext=text='{i}':x=4:y=4:fontsize=20:fontcolor=yellow:box=1:boxcolor=black", fr)
        lst.append(fr)
    if lst:
        sh("ffmpeg", "-y", "-loglevel", "error", "-framerate", "1", "-pattern_type", "glob", "-i", str(CAT / "hojas" / "am_*.jpg"), "-vf", "tile=6x6:padding=3", "-frames:v", "1", CAT / "hojas" / "animaciones_todas.jpg")
        for fr in lst:
            fr.unlink()
    # imágenes
    imgs = []
    for f in filas:
        p = loc(f)
        if p and f["tipo"] == "imagen":
            try:
                (w, h), alfa = png_alfa(p)
            except Exception:  # noqa: BLE001
                (w, h), alfa = (0, 0), False
            imgs.append({"raiz": f["raiz"], "carpeta": str(Path(f["ruta"]).parent), "nombre": f["nombre"], "dim": f"{w}x{h}", "alfa": "sí" if alfa else "no"})
    # reels
    reels = []
    for f in filas:
        p = loc(f)
        if not (p and f["tipo"] == "video" and f["raiz"].lower().startswith("reels")):
            continue
        d = probe(p)
        lufs, pico = loudness(p)
        txt, conf = whisper(p)
        oraciones = re.split(r"(?<=[.!?])\s+", txt)
        inicio = oraciones[0][:140] if oraciones else ""
        pal = palabras(txt)
        ranking = sorted(((len(pal & palabras(t)), t) for t in temas + [a["nombre"] for a in anims] + [i["nombre"] for i in imgs]), reverse=True)
        tema = next((t for s, t in ranking if s > 0 and t in temas), "")
        f_low = " " + inicio.lower() + " "
        gancho = sum(s in f_low for s in kw["gancho_senales"]) + ("?" in inicio) + bool(re.search(r"\d|\b(uno|dos|tres)\b", f_low))
        n = len(reels) + 1
        hoja(p, CAT / "hojas" / f"reel_{n:02d}_{Path(f['nombre']).stem}.jpg")
        reels.append({"n": n, "nombre": f["nombre"], "ruta": f["ruta"], "dur": d["dur"], "res": f"{d['ancho']}x{d['alto']}", "fps": d["fps"],
                      "vertical": "sí" if d["alto"] > d["ancho"] else "NO", "lufs": lufs, "pico": pico, "conf_whisper": conf,
                      "texto_quemado": texto_quemado(p, d["dur"]), "frase_inicial": inicio, "tema": tema,
                      "coincidencias": "; ".join(t for s, t in ranking[:4] if s > 0), "palabras": len(txt.split()),
                      "ppm": round(len(txt.split()) / max(d["dur"], 1) * 60), "gancho": gancho, "hash": ahash(p, d["dur"] / 2), "transcripcion": txt})
    # duplicados / parecidos (texto + imagen)
    for a in reels:
        sim = []
        for b in reels:
            if a is b:
                continue
            rt = difflib.SequenceMatcher(None, a["transcripcion"], b["transcripcion"]).ratio() if a["transcripcion"] and b["transcripcion"] else 0
            ham = bin(a["hash"] ^ b["hash"]).count("1")
            if rt > 0.6 or (ham <= 6 and abs(a["dur"] - b["dur"]) < 2):
                sim.append(f"{b['nombre']} (texto {rt:.0%}, imagen {64 - ham}/64)")
        a["parecidos"] = "; ".join(sim)
    # puntaje de fuerza (para ordenar; el motivo queda en columnas)
    for r in reels:
        dur_ok = 1 if 15 <= r["dur"] <= 60 else 0
        r["fuerza"] = round(3 * r["gancho"] + 4 * r["conf_whisper"] + 2 * dur_ok + (r["vertical"] == "sí") - (1 if r["texto_quemado"] else 0) + min(r["ppm"], 200) / 100, 2)
    def guardar(nombre, rows, campos=None):
        if not rows:
            return
        with open(CAT / nombre, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=campos or list(rows[0].keys()), extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
    guardar("catalogo.csv", reels, [k for k in reels[0] if k not in ("hash",)] if reels else None)
    guardar("animaciones.csv", anims)
    guardar("imagenes.csv", imgs)
    # cruce reel ↔ tema ↔ animaciones/imágenes
    cruce = []
    for r in reels:
        pal = palabras(r["transcripcion"] + " " + r["tema"])
        an = sorted(((len(pal & palabras(a["nombre"])), a["nombre"]) for a in anims), reverse=True)
        im = sorted(((len(pal & palabras(i["carpeta"] + " " + i["nombre"])), i["carpeta"].split("/")[-1] + "/" + i["nombre"]) for i in imgs), reverse=True)
        cruce.append({"reel": r["nombre"], "tema": r["tema"], "animaciones": "; ".join(n for s, n in an[:3] if s > 0),
                      "imagenes": "; ".join(n for s, n in im[:3] if s > 0)})
    guardar("cruce.csv", cruce)
    # resumen de datos
    cnt = lambda t: sum(f["tipo"] == t for f in filas)
    sub_img = {}
    for i in imgs:
        sub_img.setdefault(i["carpeta"], []).append(i)
    L = ["# Datos del catálogo", "", f"- Carpetas: {cnt('carpeta')} · videos: {cnt('video')} · imágenes: {cnt('imagen')} · documentos: {cnt('documento') + cnt('gdoc')} · otros: {cnt('otro')}",
         f"- Reels analizados: {len(reels)} · animaciones: {len(anims)} · imágenes: {len(imgs)}", "", "## Temas (subcarpetas)", *[f"- {t}" for t in temas],
         "", "## Subcarpetas de imágenes", *[f"- {k}: {len(v)} archivos, {sum(x['alfa'] == 'sí' for x in v)} con transparencia, ej.: {', '.join(x['nombre'] for x in v[:3])}" for k, v in sub_img.items()],
         "", "## Documentos", *[f"- {p.name}: {len(p.read_text(errors='ignore'))} caracteres" for p in sorted((CAT / 'docs').glob('*.txt'))]]
    (CAT / "datos.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    for t in ("tmp.wav", "tmp_w.json", "tmp_ocr.png"):
        (CAT / t).unlink(missing_ok=True)
    print("analizados:", len(reels), "reels,", len(anims), "animaciones,", len(imgs), "imágenes")

if __name__ == "__main__":
    {"inventario": inventario, "descargar": descargar, "analizar": analizar}[sys.argv[1]]()
