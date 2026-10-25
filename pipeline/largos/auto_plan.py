"""Candidatos de los videos largos → filas listas para el lote, sin edición a mano.
Lee largos/out/*/candidatos.json (descifrados) y agrega a plans/: textos.csv, calendario.csv (días siguientes), temas.csv,
uso_assets.csv y largos_cortes.csv. Gancho = frase inicial recortada a ≤ 32 caracteres en límite de palabra; clave = palabra de tema
(o la más larga); sin gráfico de formato (la densidad la dan la foto del tema y los punch-in).
Uso: python pipeline/largos/auto_plan.py <dir_out> [mín_puntaje] [máx_clips]"""
import csv, json, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
P = RAIZ / "plans"
TEMAS = [("01", r"segur|confianza en vos|autoestima"), ("02", r"conversa|pregunt|hablar con"), ("05", r"chat|mensaje|whatsapp|instagram|redes"),
         ("04", r"rechaz|\bno\b te"), ("15", r"cita|plan|invit"), ("11", r"cuerpo|gesto|mirada|postura"), ("18", r"confia"),
         ("07", r"selectiv|limite|criterio"), ("16", r"ansie|nervio|calma|apur"), ("10", r"amigos|social|salir"), ("03", r"atrac")]
CTAS = ["14-quien-te-gusta", "18-tu-proximo-paso", "16-pasar-a-la-practica", "12-frase-perfecta", "15-sostener-el-vinculo", "33-empeza-hoy", "17-guia-para-empezar"]
ESTILOS = ["punch", "push", "capas", "mano"]
VACIAS = set("que de la el los las un una y o en con por para no se es te tu vos lo al del a mi me le les su sus si pero como mas".split())

def nrm(t):
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")

def gancho(frase):
    f = re.sub(r"^(y|que|bueno|entonces|o sea|osea|pero)\s+", "", frase.strip(), flags=re.I)
    f = re.split(r"[.?!]", f)[0] if len(f) > 32 else f
    pal, out = f.split(), ""
    for w in pal:
        if len(out) + len(w) + 1 > 32:
            break
        out = f"{out} {w}".strip()
    out = re.sub(r"[,;:]+$", "", out)
    while out.split() and nrm(out.split()[-1]) in VACIAS:  # nunca terminar en palabra débil
        out = " ".join(out.split()[:-1])
    return out.upper()

def clave(g):
    ws = [w.strip("¿?¡!.,") for w in g.split()]
    tema = [w for w in ws if re.search(r"atrac|mujer|cita|segur|confianza|rechaz|chat|beso|error|nunca|verdad", nrm(w))]
    return (tema or sorted(ws, key=len, reverse=True) or [""])[0]

def main(d, minimo=0.0, maximo=60):
    cands = []
    for f in sorted(Path(d).glob("*/candidatos.json")):
        cands += json.loads(f.read_text(encoding="utf-8"))
    cands = sorted([c for c in cands if c["score"] >= float(minimo)], key=lambda c: -c["score"])[:int(maximo)]
    cal = list(csv.DictReader(open(P / "calendario.csv", encoding="utf-8")))
    ya = {r["clip"] for r in cal}
    cands = [c for c in cands if c["k"] not in ya]
    dia, est, cta = int(cal[-1]["dia"]), cal[-1]["estilo"], cal[-1]["cta"]
    imgs = [r["archivo"] for r in csv.DictReader(open(P / "imagenes.csv", encoding="utf-8"))]
    usadas = {r["foto"] for r in csv.DictReader(open(P / "uso_assets.csv", encoding="utf-8"))}
    filas = {"textos": [], "cal": [], "temas": [], "uso": [], "cortes": []}
    for c in cands:
        dia += 1
        est = ESTILOS[(ESTILOS.index(est) + 1) % 4]
        cta = next(x for x in CTAS[CTAS.index(cta) + 1:] + CTAS if x != cta) if cta in CTAS else CTAS[0]
        texto = nrm(c["texto"])
        tema = next((t for t, r in TEMAS if re.search(r, texto)), "03")
        foto = next((i for i in sorted(imgs) if i[:2] == tema and i not in usadas), next(i for i in sorted(imgs) if i[:2] == tema))
        usadas.add(foto)
        gA = gancho(c["primera"])
        segunda = re.split(r"(?<=[.?!])\s+", c["texto"])
        gB = gancho(segunda[1]) if len(segunda) > 1 else gA
        desc = re.split(r"(?<=[.?!])\s+", c["texto"])[0][:150]
        filas["textos"].append([c["k"], "auto", "largos", gA, clave(gA), gB, clave(gB), "", "", "", "", "", "", desc,
                                "#seduccion|#atraccion|#citas|#hombres|#podcast"])
        filas["cal"].append([dia, c["k"], "auto", est, cta, "largos"])
        filas["temas"].append([c["k"], tema])
        filas["uso"].append([dia, c["k"], tema, foto, "no", "", ""])
        filas["cortes"].append([c["k"], c["k"].split("_")[0], c["desde"], c["hasta"], c["score"]])
    for nombre, f in (("textos", "textos.csv"), ("cal", "calendario.csv"), ("temas", "temas.csv"), ("uso", "uso_assets.csv")):
        with open(P / f, "a", newline="", encoding="utf-8") as fh:
            csv.writer(fh).writerows(filas[nombre])
    nuevo = not (P / "largos_cortes.csv").exists()
    with open(P / "largos_cortes.csv", "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if nuevo:
            w.writerow(["k", "video", "desde", "hasta", "score"])
        w.writerows(filas["cortes"])
    print(json.dumps([c["k"] for c in cands]))

if __name__ == "__main__":
    main(*sys.argv[1:4])
