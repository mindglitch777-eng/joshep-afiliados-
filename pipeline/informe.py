"""salida/informe.md: análisis + gancho (variantes) + arranque (6 candidatos) + encuadre + plan + QA."""
import json
from comun import WORK, leer

def main():
    qa, plan = leer("salida/qa.json"), leer(WORK / "plan.json")
    hk, ar = leer(WORK / "hooks.json"), leer(WORK / "arranque.json")
    L = [(WORK / "informe.md").read_text(encoding="utf-8"), "## Gancho", "", "| fórmula | texto | caracteres | elegida |", "|---|---|---|---|"]
    L += [f"| {v['formula']} · {v['nombre']} | {v['texto']} | {v['caracteres']} | {'✅' if v['formula'] == hk['elegida'] else ''} |" for v in hk["variantes"]]
    g = qa.get("gancho") or {}
    L += ["", f"- En pantalla: {g.get('tam_px')} px, {g.get('lineas')} líneas, y {g.get('top')}–{g.get('borde_inferior')} (sobre los ojos), bajada de video {g.get('bajada_video_px')} px.",
          "- Cambiar de variante: `\"gancho_variante\": \"B\"` en `plan.override.json` y re-render. Previews: `preview-A/B/C.mp4`.",
          "", "## Arranque y cuadro 0", "",
          f"- Voz plena a {ar['inicio_voz_base']:.2f} s del corte → se recortó {ar['recorte']:.3f} s: la primera palabra empieza a **{ar['primera_palabra']:.3f} s**.",
          "", "| # | t (s) | puntaje | notas | cumple ≤0.15 s |", "|---|---|---|---|---|"]
    L += [f"| ![c{c['n']}](candidatos/c{c['n']}.jpg) {c['n']} | {c['t']:.2f} | {c['puntaje']} | {', '.join(c['notas'])} | {'✅' if c['cumple_015'] else '—'} |" for c in ar["candidatos"]]
    L += ["", f"## Style pack: **{qa.get('style_pack')}**", "- Rotación automática (no repite el del clip anterior); forzar con `\"style_pack\": \"capas\"` en el override. Previews: `pack-punch/push/capas/mano.mp4`."]
    m, fl = qa["menton_vs_subtitulo"], qa["flash"]
    L += [f"- Mentón (con barba) vs subtítulo: aire mínimo {m['aire_min_px']} px, cuadros con menos de 24 px: {m['cuadros_con_menos_de_24px']} {'✅' if m['ok'] else '⚠'}",
          f"- Flash de exposición en {fl['tiempos_s']} s · seguridad {'✅' if fl['ok'] else '⚠'} · cuadro 0 {'✅' if fl['cuadro0'] else '—'}"]
    L += ["", "## Encuadre", f"- Video {plan['videoInfo']['ancho']}x{plan['videoInfo']['alto']} → modo **{plan['encuadre']}**, cara en {qa['cara']['cobertura']*100:.0f}% de las muestras."]
    L += [f"- ⚠ {a}" for a in qa["cara"]["avisos"]]
    L += ["", "## Plan", *[f"- {p['tipo']} {p['desde']}–{p['hasta']} s: " + json.dumps({k: v for k, v in p.items() if k not in ('tipo', 'desde', 'hasta', 'tiempos')}, ensure_ascii=False) for p in plan["piezas"]],
          f"- {len(plan['cortes'])} jump cuts, {sum(1 for w in plan['subtitulos'] if w.get('clave'))} palabras clave"]
    s = qa["solape_cara"]
    L += ["", "## QA", f"- Audio: {qa['audio']['lufs_integrado']} LUFS, true peak {qa['audio']['true_peak_dbtp']} dBTP {'✅' if qa['audio']['ok'] else '⚠'}",
          f"- Solape con la cara: gancho/ojos {s['gancho_sobre_ojos_pct']}% · gancho/boca {s['gancho_sobre_boca_pct']}% · subtítulos/boca-mentón {s['subtitulos_sobre_boca_o_menton_pct']}% · íconos/cara {s['iconos_sobre_cara_pct']}% · tarjetas/ojos-boca {s['tarjetas_sobre_ojos_o_boca_pct']}% → metas {'✅' if qa['metas_solape_ok'] else '⚠'}",
          f"- Íconos omitidos por no tener lugar fuera de la cara: {s['iconos_omitidos_por_falta_de_lugar']}%",
          f"- Sin sonido: cuadro 0 con el gancho completo {'✅' if qa['cuadro0_gancho_completo'] else '❌'} · silencio inicial: {qa['audio'].get('silencio_inicial') or 'ninguno'} · primer impacto de sonido a {qa['primer_sonido_s']} s",
          f"- Tramos > 1.5 s sin evento: {len(qa['huecos_mayores_1_5s'])} · textos fuera de zona segura: {len(qa['textos_fuera_zona_segura'])}",
          *[f"- ⚠ {a}" for a in qa["avisos"]], f"- Minutos de Actions de esta corrida: **{qa['minutos_corrida']}**"]
    open("salida/informe.md", "w", encoding="utf-8").write("\n".join(L) + "\n")

if __name__ == "__main__":
    main()
