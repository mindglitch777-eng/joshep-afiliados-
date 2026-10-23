"""post.md: 3 títulos + hashtags + aviso de link de afiliado (plantillas, sin IA).  Uso: python pipeline/post.py salida/post.md"""
import sys
from comun import WORK, cfg, leer, norm

KW = cfg("keywords")

def main(salida):
    plan = leer(WORK / "plan.json")
    gancho = next((p["texto"] for p in plan["piezas"] if p["tipo"] == "gancho"), "")
    claves = [w["texto"].strip(".,;:!?").lower() for w in plan["subtitulos"] if w.get("clave")]
    positivas = [w["texto"].strip(".,;:!?").lower() for w in plan["subtitulos"] if w.get("tono") == "pos"]
    tema = positivas[0] if positivas else "atracción"
    titulos = [gancho.capitalize().rstrip(".") + " 👀", f"Lo que nadie te dice sobre {tema}", f"Si querés generar {tema}, mirá esto hasta el final"]
    tags = ["#seduccion", "#atraccion", "#citas", "#confianza", "#psicologia", "#mujeres", "#consejos", "#parati", "#fyp"]
    tags += [f"#{norm(c)}" for c in claves[:3] if f"#{norm(c)}" not in tags]
    md = ["# Post", "", "## Títulos", *[f"{i}. {t}" for i, t in enumerate(titulos, 1)], "", "## Hashtags", " ".join(tags), "",
          "## Aviso (pegar en la descripción)", "🔗 Link en mi perfil. *Soy afiliado: si comprás por mi link recibo una comisión, sin costo extra para vos.*", "",
          "_Créditos: contenido de Joseph Seducción usado con autorización de su programa de afiliados._"]
    open(salida, "w", encoding="utf-8").write("\n".join(md) + "\n")

if __name__ == "__main__":
    main(sys.argv[1])
