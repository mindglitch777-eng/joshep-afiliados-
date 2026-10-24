"""Utilidades compartidas del pipeline."""
import json, re, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
WORK = RAIZ / "work"

def cfg(nombre):
    return json.loads((RAIZ / "config" / f"{nombre}.json").read_text(encoding="utf-8"))

def leer(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def guardar(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

def sh(*args, capturar=False):
    r = subprocess.run([str(a) for a in args], capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(r.stderr[-3000:])
        raise SystemExit(f"falló: {args[0]}")
    return r.stdout + r.stderr if capturar else r.stdout

def norm(t):
    return re.sub(r"[^a-záéíóúñü0-9]", "", t.lower())

def duracion(video):
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video).strip())

def info_video(video):
    out = sh("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation", "-of", "json", video)
    s = json.loads(out)["streams"][0]
    w, h = s["width"], s["height"]
    rot = next((abs(int(d.get("rotation", 0))) for d in s.get("side_data_list", [])), 0)
    return (h, w) if rot in (90, 270) else (w, h)

def asegurar_base():
    """Guarda una sola vez la salida de cortar.py como *_base para que los recortes posteriores sean repetibles."""
    import shutil
    if not (WORK / "cortado_base.mp4").exists():
        shutil.move(WORK / "cortado.mp4", WORK / "cortado_base.mp4")
        shutil.copy(WORK / "palabras_clip.json", WORK / "palabras_base.json")
        shutil.copy(WORK / "cortes.json", WORK / "cortes_base.json")
