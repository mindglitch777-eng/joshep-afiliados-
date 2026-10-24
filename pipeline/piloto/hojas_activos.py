"""Hojas para elegir material: CTA (1 cuadro cada 0,5 s con su tiempo), animaciones candidatas e imágenes por tema."""
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
A, OUT = RAIZ / "piloto" / "activos", RAIZ / "piloto" / "out" / "activos"
OUT.mkdir(parents=True, exist_ok=True)
sh = lambda *a: subprocess.run([str(x) for x in a], capture_output=True)
for tipo in ("cta", "anim"):
    for v in sorted((A / tipo).glob("*.mp4")):
        sh("ffmpeg", "-y", "-loglevel", "error", "-i", v, "-vf", "fps=2,scale=150:-2,drawtext=text='%{pts\\:hms}':x=4:y=4:fontsize=14:fontcolor=yellow:box=1:boxcolor=black,tile=6x2:padding=2",
           "-frames:v", "1", OUT / f"{tipo}_{v.stem}.jpg")
from PIL import Image, ImageDraw
for tema in sorted({p.name[:2] for p in (A / "img").glob("*")}):
    fs = sorted((A / "img").glob(f"{tema}_*"))
    hoja = Image.new("RGB", (len(fs) * 186, 350), "black")
    for i, f in enumerate(fs):
        im = Image.open(f).convert("RGB")
        im.thumbnail((180, 320))
        hoja.paste(im, (i * 186 + 3, 3))
        ImageDraw.Draw(hoja).text((i * 186 + 6, 328), f.name[3:28], fill="yellow")
    hoja.save(OUT / f"img_tema{tema}.jpg", quality=80)
print("hojas listas")
