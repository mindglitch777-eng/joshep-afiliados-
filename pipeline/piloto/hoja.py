"""Hoja de contacto del clip final: cuadros en 0 s, 1 s, el medio de cada gráfico principal y el cierre (CTA)."""
import json, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

def main(clip, video, salida):
    plan = json.loads((RAIZ / "piloto" / "build" / clip / "plan.json").read_text(encoding="utf-8"))
    ts = [0.0, 1.0]
    for p in plan["piezas"]:
        if p["tipo"] not in ("gancho",):
            ts.append(round((p["desde"] + p["hasta"]) / 2 if p["tipo"] != "cta" else p["hasta"] - 0.3, 2))
    ts = sorted(set(ts))[:12]
    tmp = Path(salida).with_suffix("")
    tmp.mkdir(exist_ok=True)
    for i, t in enumerate(ts):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", video, "-frames:v", "1", "-vf",
                        f"scale=270:-2,drawtext=text='{t:.1f}s':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black", str(tmp / f"{i:02d}.jpg")])
    cols = min(len(ts), 6)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1", "-i", str(tmp / "%02d.jpg"), "-vf", f"tile={cols}x{-(-len(ts) // cols)}:padding=4:color=black",
                    "-frames:v", "1", salida])
    print("hoja:", ts)

if __name__ == "__main__":
    main(*sys.argv[1:4])
