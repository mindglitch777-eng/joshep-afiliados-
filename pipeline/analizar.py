"""Busca los momentos más fuertes del video y explica por qué gana uno y por qué se descartan los otros.
Uso: python pipeline/analizar.py [clip_start] [clip_end]  → work/analisis.json + work/informe.md"""
import re, sys, wave
import numpy as np
from comun import WORK, cfg, guardar, leer, norm

KW, P = cfg("keywords"), cfg("pipeline")
IMPACTO = {norm(w) for w in KW["impacto"] + KW["positivas"] + KW["negativas"]}
RELLENO = [r.lower() for r in KW["relleno"]]

def energia_por_segundo(wav):
    with wave.open(str(wav)) as w:
        sr, x = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    n = len(x) // sr
    rms = np.sqrt(np.mean(x[: n * sr].reshape(n, sr) ** 2, axis=1) + 1e-9)
    return 20 * np.log10(rms)

def oraciones(ps):
    out, cur = [], []
    for i, p in enumerate(ps):
        cur.append(p)
        sig = ps[i + 1] if i + 1 < len(ps) else None
        if not sig or re.search(r"[.!?…]$", p["texto"]) or sig["desde"] - p["hasta"] >= 0.7:
            out.append(cur)
            cur = []
    return out

texto = lambda ws: " ".join(w["texto"] for w in ws)

def puntuar(ws, db, db_medio):
    t0, t1 = ws[0]["desde"], ws[-1]["hasta"]
    primera = oraciones(ws)[0]
    f = texto(primera).lower()
    disparadores, razones = [], {}
    # gancho: primera frase
    g = 0
    for s in KW["gancho_senales"]:
        if s in f:
            g += 8; disparadores.append(f'gancho «{s}»')
    if "?" in f: g += 6; disparadores.append("arranca con pregunta")
    if re.search(r"\d|\b(uno|dos|tres|cuatro|cinco)\b", f): g += 4; disparadores.append("número en el arranque")
    if re.search(r"\b(vos|te|tu|tus|sos)\b", f): g += 4
    if norm(primera[0]["texto"]) in IMPACTO: g += 6
    if len(primera) <= 12: g += 4
    razones["gancho"] = min(g, 30)
    # frases de impacto
    imp = [w for w in ws if norm(w["texto"]) in IMPACTO]
    razones["impacto"] = min(25, round(len(imp) / max(t1 - t0, 1) * 60 * 2.5))
    disparadores += [f'«{w["texto"]}» ({w["desde"]:.1f}s)' for w in imp[:4]]
    # pausas dramáticas antes de palabra de impacto
    pausas = sum(1 for a, b in zip(ws, ws[1:]) if 0.4 <= b["desde"] - a["hasta"] <= 1.2 and norm(b["texto"]) in IMPACTO)
    razones["pausas"] = min(10, pausas * 3)
    # energía de la voz respecto del promedio del video
    seg = db[int(t0): max(int(t1), int(t0) + 1)]
    dif = float(np.mean(seg) - db_medio) if len(seg) else 0.0
    razones["energia"] = int(np.clip(10 + dif * 4, 0, 20))
    # relleno (penaliza)
    low = " " + texto(ws).lower() + " "
    n_rell = sum(len(re.findall(rf"\b{re.escape(r)}\b", low)) for r in RELLENO)
    ratio = n_rell / max(len(ws), 1)
    razones["relleno"] = -min(20, round(ratio * 200))
    # estructura que la plantilla sabe mostrar
    est = 0
    if re.search(r"en vez de|no .{1,40} sino|no es .{1,40}, es", low): est += 8; disparadores.append("comparación")
    if sum(1 for w in ws if norm(w["texto"]) in KW["ordinales"]) >= 2: est += 8; disparadores.append("lista")
    razones["estructura"] = est
    dur = t1 - t0
    razones["duracion"] = round(5 - abs(dur - 30) / 4)
    razones["cierre"] = 5 if re.search(r"[.!?]$", ws[-1]["texto"]) else 0
    total = sum(razones.values())
    return {"inicio": round(t0, 2), "fin": round(t1, 2), "dur": round(dur, 1), "puntaje": total, "detalle": razones,
            "energia_db": round(dif, 1), "relleno_ratio": round(ratio, 3), "disparadores": disparadores, "texto": texto(ws)}

def candidatos(ps):
    ors = oraciones(ps)
    out = []
    for i in range(len(ors)):
        ws = []
        for o in ors[i:]:
            ws = ws + o
            d = ws[-1]["hasta"] - ws[0]["desde"]
            if d > P["clip_max_s"]:
                break
            if d >= P["clip_min_s"]:
                out.append(list(ws))
    return out

def motivo_descarte(c, ganador):
    d, g = c["detalle"], ganador["detalle"]
    m = []
    if d["gancho"] < 10: m.append(f"sin gancho (gancho {d['gancho']}/30)")
    if c["relleno_ratio"] > 0.04: m.append(f"relleno ({c['relleno_ratio']*100:.0f}% de muletillas)")
    if d["energia"] < 8: m.append(f"poca energía ({c['energia_db']:+.1f} dB vs promedio)")
    if d["duracion"] < 2: m.append(f"duración ({c['dur']} s, lejos de 30 s)")
    if d["impacto"] < g["impacto"] - 5: m.append("pocas frases de impacto")
    if not m: m.append(f"puntaje menor ({c['puntaje']} vs {ganador['puntaje']})")
    return "; ".join(m)

def main(clip_start=None, clip_end=None):
    ps = leer(WORK / "palabras.json")
    db = energia_por_segundo(WORK / "audio.wav")
    db_medio = float(np.mean(db[db > -60])) if np.any(db > -60) else -30.0
    cands = [puntuar(ws, db, db_medio) for ws in candidatos(ps)]
    if clip_start is not None:
        ws = [p for p in ps if p["desde"] >= clip_start - 0.05 and p["hasta"] <= clip_end + 0.05]
        elegido = puntuar(ws, db, db_medio)
        elegido["manual"] = True
    cands.sort(key=lambda c: -c["puntaje"])
    # top sin superposición > 30%
    top = []
    for c in cands:
        if all(min(c["fin"], t["fin"]) - max(c["inicio"], t["inicio"]) < 0.3 * c["dur"] for t in top):
            top.append(c)
        if len(top) >= P["top_momentos"]:
            break
    if clip_start is None:
        if not top:
            raise SystemExit("No hay tramos de 20–40 s con habla continua: pasá clip_start y clip_end.")
        elegido = top[0]
    otros = [c for c in top if c is not elegido]
    guardar(WORK / "analisis.json", {"elegido": elegido, "top": top, "db_medio": db_medio, "n_candidatos": len(cands)})
    # palabras de baja confianza dentro del clip
    dudosas = [p for p in ps if elegido["inicio"] <= p["desde"] <= elegido["fin"] and p.get("conf", 1) < 0.5]
    L = ["# Informe del clip", "",
         f"**Elegido:** {elegido['inicio']:.1f}–{elegido['fin']:.1f} s ({elegido['dur']} s) · puntaje **{elegido['puntaje']}**" + (" · rango manual" if elegido.get("manual") else ""),
         "", f"> {elegido['texto']}", "",
         "**Por qué:** " + ", ".join(f"{k} {v:+d}" for k, v in elegido["detalle"].items()),
         "", "**Lo disparó:** " + ("; ".join(elegido["disparadores"]) or "—"), "",
         f"## Top {len(top)} momentos (de {len(cands)} tramos evaluados)", "",
         "| # | tramo | puntaje | gancho | impacto | pausas | energía | relleno | estructura | frases que lo dispararon |", "|---|---|---|---|---|---|---|---|---|---|"]
    for i, c in enumerate(top, 1):
        d = c["detalle"]
        L.append(f"| {i}{' ✅' if c is elegido else ''} | {c['inicio']:.0f}–{c['fin']:.0f} s | {c['puntaje']} | {d['gancho']} | {d['impacto']} | {d['pausas']} | {d['energia']} | {d['relleno']} | {d['estructura']} | {'; '.join(c['disparadores'][:4])} |")
    L += ["", "## Por qué se descartaron los otros", ""]
    L += [f"- **{c['inicio']:.0f}–{c['fin']:.0f} s**: {motivo_descarte(c, elegido)}. Arranca: «{' '.join(c['texto'].split()[:12])}…»" for c in otros] or ["- No hubo otros tramos válidos."]
    L += ["", "## Palabras para revisar (confianza de Whisper < 50%)", ""]
    L += [f"- {p['desde']:.1f} s: «{p['texto']}» ({p['conf']*100:.0f}%)" for p in dudosas] or ["- Ninguna."]
    (WORK / "informe.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"elegido {elegido['inicio']}–{elegido['fin']} puntaje {elegido['puntaje']}")

if __name__ == "__main__":
    a = [float(x) for x in sys.argv[1:3] if x]
    main(*(a if len(a) == 2 else []))
