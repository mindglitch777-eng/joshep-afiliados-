"""Materiales de Joseph, una sola vez (en Actions): OCR de las 33 animaciones, botón de los CTA y hoja de las 100 imágenes.
- animaciones_texto.csv: texto (tesseract spa) de un cuadro a 3 s de cada animación de apoyo y CTA.
- cta_boton.csv: por CTA, si aparece «link/perfil/enlace» en la mitad de abajo en algún cuadro (1–5,5 s) y en qué y.
- imagenes_hoja.jpg: miniaturas de las 100 imágenes agrupadas por tema (carpeta), baja resolución.
Uso: python pipeline/lote/materiales.py <salida>"""
import csv, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parents[2]
A = RAIZ / "piloto" / "activos"

def cuadro(video, t, out):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", str(video), "-frames:v", "1", str(out)], check=True)

def ocr(img, psm=6):
    r = subprocess.run(["tesseract", str(img), "-", "-l", "spa", "--psm", str(psm), "tsv"], capture_output=True, text=True).stdout
    return [l.split("\t") for l in r.splitlines()[1:] if len(l.split("\t")) == 12]

def main(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    tmp = out / "tmp"; tmp.mkdir(exist_ok=True)
    filas, botones = [], []
    for tipo in ("anim", "cta"):
        for v in sorted((A / tipo).glob("*.mp4")):
            cuadro(v, 3.0, tmp / "f.png")
            pal = [w for w in ocr(tmp / "f.png") if w[11].strip() and float(w[10]) > 50]
            texto = re.sub(r"\s+", " ", " ".join(w[11] for w in pal)).strip()
            filas.append({"tipo": "apoyo" if tipo == "anim" else "cta", "archivo": v.name, "texto": texto})
            if tipo == "cta":
                hallado = []
                for t in (1.0, 2.0, 3.0, 4.0, 5.0, 5.5):
                    cuadro(v, t, tmp / "f.png")
                    h = Image.open(tmp / "f.png").height
                    for w in ocr(tmp / "f.png", 11):
                        if re.search(r"link|perfil|enlace", w[11], re.I) and int(w[7]) > h * 0.5 and float(w[10]) > 40:
                            hallado.append((t, int(w[7])))
                botones.append({"archivo": v.name, "boton": "si" if hallado else "no", "desde_s": min((t for t, _ in hallado), default=""),
                                "y_px": min((y for _, y in hallado), default="")})
    with open(out / "animaciones_texto.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, ["tipo", "archivo", "texto"]); w.writeheader(); w.writerows(filas)
    with open(out / "cta_boton.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, ["archivo", "boton", "desde_s", "y_px"]); w.writeheader(); w.writerows(botones)
    # hoja de los CTA: 6 cuadros por animación (1–5,8 s) para ver a ojo dónde está el botón
    ctas = sorted((A / "cta").glob("*.mp4"))
    TS = (1.0, 2.0, 3.0, 4.0, 5.0, 5.8)
    hc = Image.new("RGB", (60 + len(TS) * 164, len(ctas) * 290), "white")
    dc = ImageDraw.Draw(hc)
    for i, v in enumerate(ctas):
        dc.text((4, i * 290 + 140), v.name[:2], fill="black")
        for j, t in enumerate(TS):
            cuadro(v, t, tmp / "c.png")
            im = Image.open(tmp / "c.png").convert("RGB"); im.thumbnail((160, 284), Image.LANCZOS)
            hc.paste(im, (60 + j * 164, i * 290))
    hc.save(out / "ctas_hoja.jpg", quality=72)
    # hoja de imágenes por tema: una fila por carpeta (00 = sueltas), miniaturas de 110 px de ancho
    imgs = sorted((A / "img").glob("*.png"))
    temas = {}
    for p in imgs:
        temas.setdefault(p.name[:2], []).append(p)
    TW, TH, ET = 110, 197, 150
    cols = max(len(v) for v in temas.values())
    hoja = Image.new("RGB", (ET + cols * (TW + 4), len(temas) * (TH + 6)), "white")
    d = ImageDraw.Draw(hoja)
    for i, (t, ps) in enumerate(sorted(temas.items())):
        y = i * (TH + 6)
        nombre = re.sub(r"^\d+-|-\d+\.png$|\.png$", "", ps[0].name[3:]).replace("_", " ")
        d.text((6, y + TH // 2 - 10), f"{t} {nombre[:18]}", fill="black")
        for j, p in enumerate(ps):
            im = Image.open(p).convert("RGB"); im.thumbnail((TW, TH), Image.LANCZOS)
            hoja.paste(im, (ET + j * (TW + 4), y))
    hoja.save(out / "imagenes_hoja.jpg", quality=70)
    with open(out / "imagenes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(["tema", "archivo", "ancho", "alto"])
        for p in imgs:
            im = Image.open(p); w.writerow([p.name[:2], p.name, im.width, im.height])
    print(f"{len(filas)} animaciones con OCR · {sum(b['boton'] == 'si' for b in botones)}/{len(botones)} CTA con botón · {len(imgs)} imágenes en {len(temas)} temas")

if __name__ == "__main__":
    main(sys.argv[1])
