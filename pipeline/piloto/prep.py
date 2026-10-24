"""Preparación de un reel del piloto: palabras (whisper, con confianza), silencios, audio, cara y final.
Uso: python pipeline/piloto/prep.py <clip>   (ej. 17) → piloto/out/<clip>/"""
import json, re, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))

def sh(*a):
    return subprocess.run([str(x) for x in a], capture_output=True, text=True)

def main(clip):
    src = RAIZ / "piloto" / "activos" / "reel" / f"{clip}.mov"
    out = RAIZ / "piloto" / "out" / clip
    out.mkdir(parents=True, exist_ok=True)
    wav = out / "audio.wav"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav)
    kw = json.loads((RAIZ / "config/keywords.json").read_text(encoding="utf-8"))
    modelo = RAIZ / "whisper.cpp/models/ggml-medium.bin"
    sh(RAIZ / "whisper.cpp/build/bin/whisper-cli", "-m", modelo, "-l", "es", "-t", "4", "-ml", "1", "-sow", "-ojf", "-np",
       "--prompt", kw["vocabulario_whisper"] + " Vos, sos, querés, tenés.", "-f", wav, "-of", out / "whisper")
    segs = json.loads((out / "whisper.json").read_text(encoding="utf-8"))["transcription"]
    ps = []
    for s in segs:
        t = s["text"].strip()
        if not t or t.startswith("["):
            continue
        toks = [k for k in s.get("tokens", []) if not k["text"].startswith("[_")]
        conf = min((k["p"] for k in toks), default=1.0)
        if ps and all(not c.isalnum() for c in t):
            ps[-1]["texto"] += t
            continue
        ps.append({"i": len(ps), "texto": t, "desde": round(s["offsets"]["from"] / 1000, 3), "hasta": round(s["offsets"]["to"] / 1000, 3), "conf": round(conf, 3)})
    (out / "palabras.json").write_text(json.dumps(ps, ensure_ascii=False, indent=0), encoding="utf-8")
    # silencios (para cortar por frases enteras)
    r = sh("ffmpeg", "-hide_banner", "-i", src, "-af", "silencedetect=noise=-35dB:d=0.2", "-f", "null", "-").stderr
    sil = [[float(a), float(b)] for a, b in zip(re.findall(r"silence_start: ([\d.]+)", r), re.findall(r"silence_end: ([\d.]+)", r))]
    # audio y video
    pr = json.loads(sh("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", src).stdout)
    dur = float(pr["format"]["duration"])
    lo = sh("ffmpeg", "-hide_banner", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    lo = lo[lo.rfind("Summary:"):]
    info = {"duracion": dur, "lufs": float(re.search(r"I:\s+(-?[\d.]+)", lo).group(1)), "pico": float(re.search(r"Peak:\s+(-?[\d.]+)", lo).group(1)),
            "ultima_palabra": ps[-1] if ps else None, "silencios": sil,
            "video": [{k: s.get(k) for k in ("codec_type", "width", "height", "avg_frame_rate", "pix_fmt")} for s in pr["streams"]]}
    (out / "info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    # cara en todo el reel (para planear gráficos y zooms)
    import cara
    cara.main(src, out / "cara.json", out / "cara_info.json")
    # hoja de los últimos 3 s (¿termina cortado?)
    sh("ffmpeg", "-y", "-loglevel", "error", "-sseof", "-3", "-i", src, "-vf", "fps=2,scale=160:-2,tile=6x1", "-frames:v", "1", out / "final.jpg")
    wav.unlink()
    print(f"{clip}: {len(ps)} palabras, {dur:.1f} s, {info['lufs']} LUFS")

if __name__ == "__main__":
    main(sys.argv[1])
