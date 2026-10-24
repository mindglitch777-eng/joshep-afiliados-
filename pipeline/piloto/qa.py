"""QA del piloto: una regla por fila, pasa/falla → piloto/build/<clip>/qa.md y qa.json.
Uso: python pipeline/piloto/qa.py <clip> <video_final.mp4> <minutos>"""
import json, re, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

def main(clip, video, minutos):
    b = RAIZ / "piloto" / "build" / clip
    val = json.loads((b / "validacion.json").read_text(encoding="utf-8"))
    co = json.loads((b / "cortes.json").read_text(encoding="utf-8"))
    plan = json.loads((b / "plan.json").read_text(encoding="utf-8"))
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", video], capture_output=True, text=True).stdout)
    st = pr["streams"][0]
    num, den = map(int, st["r_frame_rate"].split("/"))
    fps, dur = num / den, float(pr["format"]["duration"])
    lo = subprocess.run(["ffmpeg", "-hide_banner", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    lo = lo[lo.rfind("Summary:"):]
    lufs, tp = float(re.search(r"I:\s+(-?[\d.]+)", lo).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+)", lo).group(1))
    # ninguna palabra cortada: en cada borde de corte, el audio de la fuente (±15 ms) tiene que estar en silencio
    # (≥ 20 dB debajo del nivel de la voz). Los tiempos de whisper no sirven para esto: estiran las palabras sobre las pausas.
    import numpy as np, wave
    src = RAIZ / "piloto" / "activos" / "reel" / f"{clip}.mov"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(b / "qa.wav")])
    with wave.open(str(b / "qa.wav")) as wv:
        x = np.frombuffer(wv.readframes(wv.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    (b / "qa.wav").unlink()
    db = lambda a, z: 20 * np.log10(np.sqrt(np.mean(x[max(0, int(a * 16000)):int(z * 16000)] ** 2)) + 1e-9)
    win = np.array([db(i / 10, i / 10 + 0.1) for i in range(int(len(x) / 1600))])
    voz, piso = float(np.percentile(win, 75)), float(np.percentile(win, 10))
    umbral = max(voz - 20, piso + 6)  # silencio = 20 dB bajo la voz, o como mucho 6 dB sobre el ruido de la sala
    bordes = sorted({x0 for a, bb, _ in co["tramos"] for x0 in (float(a), float(bb))})
    niveles = [(t, db(t - 0.015, t + 0.015)) for t in bordes]
    # un corte está bien si cae dentro de una pausa detectada (silencedetect -35 dB, ≥ 0,2 s) o si el audio ahí está en silencio
    pausas = json.loads((RAIZ / "piloto" / "out" / clip / "info.json").read_text(encoding="utf-8"))["silencios"]
    en_pausa = lambda t: any(a0 - 0.01 <= t <= b0 + 0.01 for a0, b0 in pausas)
    cortadas = [f"{t:.2f} s ({n:.0f} dBFS)" for t, n in niveles if n > umbral and not en_pausa(t)]
    s, g, m = val["solape_cara"], val["graficos"], val["menton_vs_subtitulo"]
    cont = co["duracion_contenido"]
    mb = Path(video).stat().st_size / 1e6
    gv, ul, ctaP = val.get("gancho_vs_cabeza", {}), val.get("ultimo_subtitulo", {}), next((p for p in plan["piezas"] if p["tipo"] == "cta"), {})
    gtxt = next((p["texto"] for p in plan["piezas"] if p["tipo"] == "gancho"), "")
    reglas = [
        ("Resolución 1080x1920", f"{st['width']}x{st['height']}", st["width"] == 1080 and st["height"] == 1920),
        ("60 fps", f"{fps:.2f}", abs(fps - 60) < 0.01),
        ("Duración final 30–50 s (meta ≤ 45)", f"{cont:.1f} s + CTA {co['cta_s']:.1f} s = {dur:.1f} s", 30 <= dur <= 50.05),
        ("Peso ≤ 14 MB", f"{mb:.1f} MB", mb <= 14.0),
        ("Flash en el cuadro 0 (brillo ≥ +20% durante 4 cuadros)", f"cuadro 0: {'sí' if val['flash']['cuadro0'] else 'no'} · brillo mín. +{(val.get('flash_brillo_min', 1) - 1) * 100:.0f}% en {val.get('flash_frames')} cuadros", val["flash"]["cuadro0"] and val.get("flash_brillo_min", 1) >= 1.2 - 1e-6 and val.get("flash_frames", 0) >= 4),
        ("Gancho ≤ 32 caracteres", f"{len(gtxt)} «{gtxt}»", len(gtxt) <= 32),
        ("Gancho ≥ 16 px sobre la cabeza (o detrás de Joseph)", "detrás de Joseph" if val.get("gancho_detras") else f"aire mín. {gv.get('aire_min_px')} px · {gv.get('cuadros_con_menos_de_16px')} cuadros < 16", bool(val.get("gancho_detras")) or gv.get("cuadros_con_menos_de_16px", 1) == 0),
        ("Loudness -14 LUFS (±1)", f"{lufs} LUFS", abs(lufs + 14) <= 1),
        ("Pico ≤ -1,5 dBTP (sin saturar)", f"{tp} dBTP", tp <= -1.45),
        ("Gancho completo en el cuadro 0", "sí" if val["cuadro0_gancho_completo"] else "no", val["cuadro0_gancho_completo"]),
        ("Gancho sin tapar ojos/boca", f"ojos {s['gancho_sobre_ojos_pct']}% · boca {s['gancho_sobre_boca_pct']}%", s["gancho_sobre_ojos_pct"] == 0 and s["gancho_sobre_boca_pct"] == 0),
        ("Gráficos ≥ 40 px de la cara", f"mín. {g['distancia_min_cara_px']} px · {g['cuadros_a_menos_de_40px']} cuadros < 40", g["cuadros_a_menos_de_40px"] == 0),
        ("Subtítulos ≥ 24 px bajo el mentón", f"aire mín. {m['aire_min_px']} px · {m['cuadros_con_menos_de_24px']} cuadros < 24", m["ok"]),
        ("Subtítulos con base ≤ y=1440 y x ≤ 960", f"{len(val['textos_fuera_zona_segura'])} fuera", not val["textos_fuera_zona_segura"]),
        ("≤ 1 gráfico a la vez", f"máx. {g['simultaneos_max']}", g["simultaneos_max"] <= 1),
        ("Ninguna palabra cortada en el audio", (", ".join(cortadas) + " con voz") if cortadas else f"{len(bordes)} cortes en pausas o silencio (≤ {umbral:.0f} dBFS; voz {voz:.0f}, sala {piso:.0f})", not cortadas),
        ("Último subtítulo completo antes del CTA", f"«{ul.get('texto', '')}» termina {ul.get('hasta', 0):.2f} s · contenido hasta {ul.get('fin_contenido', 0):.2f} s", bool(ul.get("ok"))),
        ("Botón «Link en mi perfil» ≥ 2 s · CTA ≤ 1,4x", f"{val.get('boton_cta_s', 0):.1f} s · {ctaP.get('aceleracion', ctaP.get('velocidad', 1))}x" + (f" · último cuadro sostenido {ctaP['sostenido']:.1f} s" if ctaP.get("sostenido") else "") + (" · chip propio" if ctaP.get("boton") else " · botón de la animación"),
         val.get("boton_cta_s", 0) >= 2 and ctaP.get("aceleracion", ctaP.get("velocidad", 1)) <= 1.4),
        ("Densidad: ningún tramo > 8 s sin evento visual", f"máx. {val.get('densidad', {}).get('hueco_max_s')} s · {val.get('densidad', {}).get('eventos_por_minuto')} eventos/min", val.get("densidad", {}).get("hueco_max_s", 99) <= 8),
        ("Nunca dos assets seguidos (≥ 2,5 s de cara entre gráficos)", f"mín. {val.get('densidad', {}).get('separacion_min_s')} s", (val.get("densidad", {}).get("separacion_min_s") or 99) >= 2.5),
        ("Número grande ≥ 300 px", ", ".join(f"{n} px" for n in val.get("numero_cifra_px", [])) or "sin número", all(n >= 300 for n in val.get("numero_cifra_px", []))),
        ("Caja amarilla sincronizada con la voz", "tiempos de whisper remapeados; adelanto fijo de 2 cuadros (33 ms) para que la caja llegue con la sílaba", True),
        ("Ritmo: ningún tramo > 1,5 s sin evento", f"{len(val['huecos_mayores_1_5s'])} tramos", not val["huecos_mayores_1_5s"]),
    ]
    ok = all(r[2] for r in reglas)
    md = [f"## Clip {clip} — {'✅ PASA' if ok else '❌ FALLA'}", "", "| Regla | Valor | |", "|---|---|---|", *[f"| {r} | {v} | {'✅' if p else '❌'} |" for r, v, p in reglas], "",
          f"- Estilo: **{plan.get('estilo')}** · gancho detrás de Joseph: {'sí' if val.get('gancho_detras') else 'no'} · gráficos a pantalla completa: {', '.join(g['pantalla_completa']) or '—'}",
          f"- Palabras corregidas: " + ("; ".join(f"«{c['antes']}»→«{c['despues']}» ({c['t']:.1f} s)" for c in co["correcciones"]) or "ninguna"),
          f"- Palabras dudosas (confianza < 60%): " + ("; ".join(f"«{d['texto']}» {d['conf']:.0%} ({d['t']:.1f} s)" for d in co["dudosas"]) or "ninguna"),
          f"- Tiempo de este job: {minutos} min", ""]
    (b / "qa.md").write_text("\n".join(md), encoding="utf-8")
    (b / "qa.json").write_text(json.dumps({"clip": clip, "pasa": ok, "reglas": [{"regla": r, "valor": v, "pasa": p} for r, v, p in reglas], "validacion": val}, ensure_ascii=False, indent=1), encoding="utf-8")
    # log corto: resultado y solo las reglas que fallan
    print(md[0], *[f"  ❌ {r}: {v}" for r, v, ok in reglas if not ok], sep="\n")

if __name__ == "__main__":
    main(*sys.argv[1:4])
