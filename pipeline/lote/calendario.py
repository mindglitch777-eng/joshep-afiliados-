"""Calendario del lote (día 6 en adelante; los días 1–5 son el piloto) → plans/calendario.csv.
Reglas: nunca dos seguidos con el mismo estilo, formato o CTA; 04 y 28 separados ≥ 7 días; 07, 10, 24, 33 (ser selectivo) ≥ 4 días.
El estilo rota punch → push → capas → mano (capas = 1 de cada 4). CTA según el tema (cruce del catálogo); si choca, la alternativa.
Uso: python pipeline/lote/calendario.py"""
import csv, random
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
# CTA por tema (cruce.csv) y alternativa del mismo sentido para evitar repetir en días seguidos
CTA = {"01": "16-pasar-a-la-practica", "02": "14-quien-te-gusta", "04": "18-tu-proximo-paso", "05": "18-tu-proximo-paso", "06": "15-sostener-el-vinculo",
       "07": "14-quien-te-gusta", "08": "15-sostener-el-vinculo", "09": "15-sostener-el-vinculo", "10": "14-quien-te-gusta", "12": "14-quien-te-gusta",
       "13": "10-libro-practica", "14": "12-frase-perfecta", "16": "15-sostener-el-vinculo", "18": "13-despues-del-no", "19": "14-quien-te-gusta",
       "20": "16-pasar-a-la-practica", "21": "16-pasar-a-la-practica", "22": "12-frase-perfecta", "24": "14-quien-te-gusta", "25": "18-tu-proximo-paso",
       "26": "18-tu-proximo-paso", "27": "14-quien-te-gusta", "28": "18-tu-proximo-paso", "29": "16-pasar-a-la-practica", "30": "12-frase-perfecta",
       "31": "11-punto-de-partida", "33": "14-quien-te-gusta", "34": "33-empeza-hoy"}
ALT = {"14-quien-te-gusta": "32-leer-probar-ajustar", "18-tu-proximo-paso": "17-guia-para-empezar", "16-pasar-a-la-practica": "33-empeza-hoy",
       "15-sostener-el-vinculo": "31-guia-y-ritmo", "12-frase-perfecta": "09-libro-basico", "10-libro-practica": "32-leer-probar-ajustar",
       "13-despues-del-no": "32-leer-probar-ajustar", "11-punto-de-partida": "17-guia-para-empezar", "33-empeza-hoy": "17-guia-para-empezar"}
ESTILOS = ["punch", "push", "capas", "mano"]
PILOTO = [("17", "curva", "punch", "18-tu-proximo-paso"), ("03", "vs", "push", "14-quien-te-gusta"), ("11", "lista", "capas", "32-leer-probar-ajustar"),
          ("15", "vs", "mano", "14-quien-te-gusta"), ("23", "vs", "punch", "14-quien-te-gusta")]
SELECTIVO = {"07", "10", "24", "33"}

def main():
    fm = {r["n"]: r["formato"] for r in csv.DictReader(open(RAIZ / "plans/textos.csv", encoding="utf-8"))}
    rnd = random.Random(7)
    def ok(orden, n):
        d = len(orden)
        prev = orden[-1]
        if fm.get(n) == prev[1]:
            return False
        dia = {x[0]: i for i, x in enumerate(orden)}
        if n in ("04", "28") and ({"04", "28"} - {n}) & dia.keys() and d - dia[({"04", "28"} - {n}).pop()] < 7:
            return False
        if n in SELECTIVO and any(d - dia[s] < 4 for s in SELECTIVO & dia.keys()):
            return False
        return True
    for _ in range(20000):
        orden, resto = list(PILOTO), list(fm)
        rnd.shuffle(resto)
        while resto:
            cand = [n for n in resto if ok(orden, n)]
            if not cand:
                break
            # primero los formatos con más reels (VS), así no quedan juntos al final
            cand.sort(key=lambda n: -sum(fm[m] == fm[n] for m in resto) + rnd.random())
            n = cand[0]
            estilo = ESTILOS[(ESTILOS.index(orden[-1][2]) + 1) % 4]
            cta = CTA[n] if CTA[n] != orden[-1][3] else ALT[CTA[n]]
            orden.append((n, fm[n], estilo, cta))
            resto.remove(n)
        if not resto:
            break
    else:
        raise SystemExit("sin calendario válido")
    with open(RAIZ / "plans/calendario.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["dia", "clip", "formato", "estilo", "cta", "lote"])
        for i, (n, f, e, c) in enumerate(orden, 1):
            w.writerow([i, n, f, e, c, "piloto" if i <= 5 else "lote"])
    print(" ".join(f"{i}:{x[0]}" for i, x in enumerate(orden, 1)))

if __name__ == "__main__":
    main()
