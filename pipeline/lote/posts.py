"""posts/NN.md por clip (descripción neutra, 3–5 hashtags, portada, recordatorios) + metricas.csv vacío.
Uso: python pipeline/lote/posts.py"""
import csv
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

def main():
    tx = {r["n"]: r for r in csv.DictReader(open(RAIZ / "plans/textos.csv", encoding="utf-8"))}
    cal = list(csv.DictReader(open(RAIZ / "plans/calendario.csv", encoding="utf-8")))
    (RAIZ / "posts").mkdir(exist_ok=True)
    for c in cal:
        r = tx.get(c["clip"])
        if not r:
            continue  # piloto: sus posts ya se entregaron
        tags = r["hashtags"].split("|")[:5]
        (RAIZ / "posts" / f"{c['clip']}.md").write_text(
            f"# Día {c['dia']} — clip {c['clip']}\n\n"
            f"**Descripción (copiar):**\n\n{r['descripcion']} 🔗 Link en el perfil.\n\n{' '.join(tags)}\n\n"
            f"**Gancho en pantalla:** {r['gancho_A']} · alternativo: {r['gancho_B']}\n\n"
            f"**Portada:** cuadro a 0,2 s (gancho completo, después del flash).\n\n"
            f"**Antes de publicar:**\n- Activar «Commercial Content Disclosure» (contenido de marca / promoción de terceros).\n"
            f"- Tener el link de afiliado en la bio: el clip termina con «Link en mi perfil».\n", encoding="utf-8")
    with open(RAIZ / "metricas.csv", "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerow(["id", "fecha", "vistas", "retencion_3s", "pct_completo", "clics_link", "ventas"])
    print(f"{len(list((RAIZ / 'posts').glob('*.md')))} posts")

if __name__ == "__main__":
    main()
