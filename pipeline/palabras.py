"""Whisper.cpp (JSON completo, una palabra por segmento) → work/palabras.json con confianza por palabra.
Uso: python pipeline/palabras.py work/whisper.json [offset_s]"""
import sys
from comun import WORK, guardar, leer

def main(ruta, offset=0.0):
    segs = leer(ruta)["transcription"]
    out = []
    for s in segs:
        txt = s["text"].strip()
        if not txt or txt.startswith("["):
            continue
        toks = [t for t in s.get("tokens", []) if not t["text"].startswith("[_")]
        conf = min((t["p"] for t in toks), default=1.0)
        desde, hasta = s["offsets"]["from"] / 1000 + offset, s["offsets"]["to"] / 1000 + offset
        # puntuación suelta: se pega a la palabra anterior
        if out and all(not c.isalnum() for c in txt):
            out[-1]["texto"] += txt
            continue
        out.append({"texto": txt, "desde": round(desde, 3), "hasta": round(max(hasta, desde + 0.05), 3), "conf": round(conf, 3)})
    guardar(WORK / "palabras.json", out)
    print(f"{len(out)} palabras")

if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
