"""Arma un clip del piloto a partir de piloto/<clip>/edicion.json (decisiones de edición, sin IDs ni transcripción)
y de la preparación (piloto/out/<clip>: palabras de whisper, cara, info).
- Corta por frases enteras (tramos en segundos de la fuente) con crossfade real de audio de 30 ms sin perder sincronía.
- Voz: afftdn leve + compresor suave + loudnorm -16 (el master final a -14 lo hace scripts/master.sh).
- Glosario ("voz"→"vos" después de de/a/con/para/sos/si) + correcciones a mano por índice de palabra.
- Remapea palabras y cara al tiempo del clip; resuelve los tiempos de gráficos anclados a palabras; agrega el CTA al final.
Uso: python pipeline/piloto/armar.py <clip>  → public/raw/<clip>/..., piloto/build/<clip>/plan.json, cortes.json, post.md"""
import json, re, shutil, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from comun import cfg, norm  # noqa: E402

XF = 0.03  # crossfade de audio en cada corte (s)
VOZ = "afftdn=nf=-30,acompressor=threshold=-20dB:ratio=2.5:attack=15:release=200:makeup=1.5,loudnorm=I=-16:TP=-2:LRA=11"
PREV = set(cfg("glosario")["voz_vos_despues_de"])
CENSURA = {norm(w) for w in cfg("censura")["palabras"]}

def censurar(t):
    # primera letra + asteriscos (conserva la puntuación); el audio no se toca
    m = re.match(r"^([¿¡]?)(\w+)(.*)$", t)
    if not m or norm(m.group(2)) not in CENSURA:
        return t
    w = m.group(2)
    return m.group(1) + w[0] + "*" * (len(w) - 1) + m.group(3)

def sh(*a):
    r = subprocess.run([str(x) for x in a], capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(r.stderr[-2000:])
        raise SystemExit(f"falló {a[0]}")
    return r.stdout + r.stderr

def glosario(ps, correcciones):
    cambios = []
    for i, p in enumerate(ps):
        t0 = p["texto"]
        if str(i) in correcciones:
            p["texto"] = correcciones[str(i)]
        # "voz"→"vos" solo cuando es el pronombre: nunca en "tono de voz", "la/una/tu/mi voz", "voz grave"…
        elif (norm(t0) == "voz" and i > 0 and norm(ps[i - 1]["texto"]) in PREV
              and not (i > 1 and norm(ps[i - 2]["texto"]) in {"tono", "timbre", "volumen", "nota", "hilo"})
              and not (i + 1 < len(ps) and norm(ps[i + 1]["texto"]) in {"grave", "aguda", "alta", "baja", "firme"})):
            p["texto"] = re.sub(r"[Vv]oz", lambda m: "Vos" if m.group(0)[0] == "V" else "vos", t0)
        p["texto"] = censurar(p["texto"])
        if p["texto"] != t0:
            cambios.append({"i": i, "antes": t0, "despues": p["texto"], "t": p["desde"]})
    return cambios

def main(clip):
    # piloto: piloto/<clip>/edicion.json (a mano) · lote: plans/<clip>.json (plan_builder.py)
    fe = RAIZ / "piloto" / clip / "edicion.json"
    ed = json.loads((fe if fe.exists() else RAIZ / "plans" / f"{clip}.json").read_text(encoding="utf-8"))
    prep = RAIZ / "piloto" / "out" / clip
    build = RAIZ / "piloto" / "build" / clip
    pub = RAIZ / "public" / "raw" / clip
    for d in (build, pub):
        d.mkdir(parents=True, exist_ok=True)
    src = RAIZ / "piloto" / "activos" / "reel" / f"{clip}.mov"
    ps = json.loads((prep / "palabras.json").read_text(encoding="utf-8"))
    cambios = glosario(ps, ed.get("correcciones", {}))
    tramos = [(float(a), float(b), m) for a, b, m in ed["tramos"]]
    # cada borde interno se corre al punto más silencioso dentro de ±0.15 s (nunca a mitad de sílaba)
    import numpy as np, wave
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", build / "fuente.wav")
    with wave.open(str(build / "fuente.wav")) as wv:
        x = np.frombuffer(wv.readframes(wv.getnframes()), dtype=np.int16).astype(np.float32)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(160) / 160, mode="same"))  # ventana de 10 ms
    rdb = 20 * np.log10(rms / 32768 + 1e-9)
    piso = float(np.percentile(rdb[::160], 10))  # piso de ruido de la sala
    pausas = json.loads((prep / "info.json").read_text(encoding="utf-8"))["silencios"]
    def snap(t):
        # si el corte ya cae dentro de una pausa detectada (silencedetect), queda donde está
        if any(a0 + 0.02 <= t <= b0 - 0.02 for a0, b0 in pausas):
            return t
        # si no: el silencio real más cercano (≤ piso + 6 dB) dentro de ±0.3 s; si no hay, el punto más bajo en ±0.15 s
        a, b = max(0, int((t - 0.3) * 16000)), min(len(rms) - 1, int((t + 0.3) * 16000))
        quietos = np.where(rdb[a:b] <= piso + 6)[0]
        if len(quietos):
            return round((a + quietos[np.argmin(np.abs(a + quietos - t * 16000))]) / 16000, 3)
        a, b = max(0, int((t - 0.15) * 16000)), min(len(rms) - 1, int((t + 0.15) * 16000))
        return round((a + int(np.argmin(rms[a:b]))) / 16000, 3) if b > a else t
    ajustes = []
    for i in range(len(tramos)):
        a, b, m = tramos[i]
        na = a if i == 0 else snap(a)
        nb = b if i == len(tramos) - 1 else snap(b)
        ajustes.append({"tramo": i, "a": [a, na], "b": [b, nb]})
        tramos[i] = (na, nb, m)
    (build / "fuente.wav").unlink()
    # ── corte: video por tramos; audio con XF extra al final de cada tramo (salvo el último) para el crossfade
    fc, n = [], len(tramos)
    for i, (a, b, _) in enumerate(tramos):
        fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1[v{i}]")
        fin = b + (XF if i < n - 1 else 0)
        fc.append(f"[0:a]atrim={a}:{fin},asetpts=PTS-STARTPTS[a{i}]")
    fc.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v]")
    prev = "a0"
    for i in range(1, n):
        fc.append(f"[{prev}][a{i}]acrossfade=d={XF}:c1=tri:c2=tri[x{i}]")
        prev = f"x{i}"
    fc.append(f"[{prev}]{VOZ}[a]")
    (build / "filtro.txt").write_text(";\n".join(fc))
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-filter_complex_script", build / "filtro.txt", "-map", "[v]", "-map", "[a]",
       "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", pub / "cortado.mp4")
    # ── mapa fuente → clip
    acum, mapa = 0.0, []
    for a, b, _ in tramos:
        mapa.append((a, b, acum))
        acum += b - a
    def remap(t):
        for a, b, off in mapa:
            if a - 1e-6 <= t <= b + 1e-6:
                return off + t - a
        return None
    subs, idx = [], {}
    for p in ps:
        d, h = remap(p["desde"]), remap(min(p["hasta"], p["desde"] + 1.5))
        if d is None or not p["texto"].strip():
            continue
        if h is None:
            h = d + max(0.08, p["hasta"] - p["desde"])
        h = min(h, acum)  # el último subtítulo se completa antes del CTA
        w = {"texto": p["texto"], "desde": round(d, 3), "hasta": round(h, 3)}
        if p["i"] in ed.get("claves", []):
            w["clave"] = True
        tono = ed.get("tonos", {}).get(str(p["i"]))
        if tono:
            w["tono"] = tono
        idx[p["i"]] = len(subs)
        subs.append(w)
    def t_palabra(ref, fin=False):
        if isinstance(ref, dict):
            if "palabra" in ref:
                # si la palabra quedó justo afuera de un tramo, se usa la siguiente que sí quedó
                j = ref["palabra"]
                while j not in idx and j < max(idx):
                    j += 1
                w = subs[idx[j]]
                return round((w["hasta"] if ref.get("fin") else w["desde"]) + ref.get("mas", 0), 3)
            if "t" in ref:
                return round(remap(ref["t"]), 3)
        return ref
    # ── cara remapeada
    cara = []
    for c in json.loads((prep / "cara.json").read_text(encoding="utf-8")):
        t = remap(c["t"])
        if t is not None:
            cara.append({**c, "t": round(t, 3)})
    # ── piezas (tiempos anclados a palabras) + CTA al final
    piezas = []
    for p in ed.get("piezas", []):
        q = {k: v for k, v in p.items()}
        q["desde"] = t_palabra(p["desde"])
        # "hasta": referencia a palabra/tiempo, o un número = duración en segundos desde "desde"
        q["hasta"] = t_palabra(p["hasta"]) if isinstance(p["hasta"], dict) else round(q["desde"] + p["hasta"], 3)
        for k in ("tiempos",):
            if k in q:
                q[k] = [t_palabra(x) for x in q[k]]
        for k in ("marcaAlto", "marcaBajo", "marcaMedio", "numeroEn", "cierreEn"):
            if k in q:
                q[k] = t_palabra(q[k])
        if "archivo" in q:
            dst = pub / Path(q["archivo"]).name
            shutil.copy(RAIZ / "piloto" / "activos" / q["archivo"], dst)
            q["archivo"] = f"raw/{clip}/{dst.name}"
        piezas.append(q)
    dur = round(acum, 3)
    cta = ed["cta"]
    shutil.copy(RAIZ / "piloto" / "activos" / "cta" / cta["archivo"], pub / cta["archivo"])
    dur_cta = round((cta["fin"] - cta["inicio"]) / cta.get("velocidad", 1), 3)
    piezas.append({"tipo": "cta", "desde": dur, "hasta": round(dur + dur_cta, 3), "archivo": f"raw/{clip}/{cta['archivo']}", "inicio": cta["inicio"], "velocidad": cta.get("velocidad", 1),
                   **({"boton": cta["boton"]} if cta.get("boton") else {})})
    g = ed["gancho"]
    hcfg = cfg("hook")["duracion"]
    dur_g = round(min(max(hcfg["base"] + len(g["A"]) / hcfg["caracteres_por_segundo"], hcfg["min"]), hcfg["max"]), 2)
    piezas.insert(0, {"tipo": "gancho", "desde": 0, "hasta": dur_g, "texto": g["A"], "clave": g["claveA"], "variante": "A"})
    piezas.sort(key=lambda p: p["desde"])
    cortes = [round(off, 3) for _, _, off in mapa[1:]]
    w, h = 1080, 1920
    plan = {"fps": 60, "video": f"raw/{clip}/cortado.mp4", "videoInfo": {"ancho": w, "alto": h}, "encuadre": "cara", "estilo": ed["estilo"],
            "duracion": round(dur + dur_cta, 3), "musica": None, "cortes": cortes, "cara": cara, "piezas": piezas, "subtitulos": subs,
            "ganchos": [{"formula": "A", "texto": g["A"], "clave": g["claveA"]}, {"formula": "B", "texto": g["B"], "clave": g["claveB"]}]}
    if ed.get("capas_gancho"):
        plan["recorte"] = {"carpeta": f"raw/{clip}/recorte", "hasta": dur_g}
    (build / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    # registro de cortes (para el QA "sin palabra cortada") y de correcciones
    dudosas = [{"i": p["i"], "texto": p["texto"], "conf": p["conf"], "t": p["desde"]} for p in ps if p["conf"] < 0.6 and remap(p["desde"]) is not None]
    (build / "cortes.json").write_text(json.dumps({"tramos": [[a, b, m] for a, b, m in tramos], "ajustes_snap": ajustes, "crossfade_s": XF, "palabras_fuente": ps, "correcciones": cambios, "dudosas": dudosas,
                                                   "duracion_contenido": dur, "cta_s": dur_cta}, ensure_ascii=False, indent=1), encoding="utf-8")
    post = ed["post"]
    (build / "post.md").write_text(f"# Clip {clip}\n\n{post['descripcion']}\n\n{' '.join(post['hashtags'])}\n\n🔗 Link en mi perfil. *Soy afiliado: si comprás por mi link recibo una comisión, sin costo extra para vos.*\n\n"
                                   f"**Portada:** {post['portada']}\n\n**Ganchos:** A «{g['A']}» (renderizado) · B «{g['B']}»\n", encoding="utf-8")
    print(f"{clip}: {n} tramos, {dur:.1f} s + CTA {dur_cta:.1f} s, {len(subs)} palabras, {len(cambios)} correcciones, {len(dudosas)} dudosas")

if __name__ == "__main__":
    main(sys.argv[1])
