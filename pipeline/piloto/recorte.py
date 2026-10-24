"""Segmentación de persona (MediaPipe Selfie Segmentation) solo durante el gancho, para poner el texto DETRÁS de Joseph.
Genera PNG con alfa (persona recortada, borde suavizado) a la cadencia del video fuente.
Uso: python pipeline/piloto/recorte.py <clip> <segundos>  → public/raw/<clip>/recorte/NNNN.png + info.json"""
import json, sys
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np

RAIZ = Path(__file__).resolve().parents[2]

def main(clip, seg):
    pub = RAIZ / "public" / "raw" / clip
    out = pub / "recorte"
    out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(pub / "cortado.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    seg_m = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
    n, borde = 0, []
    while n < int(seg * fps) + 2:
        ok, f = cap.read()
        if not ok:
            break
        m = seg_m.process(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).segmentation_mask
        m = cv2.GaussianBlur(np.clip((m - 0.35) / 0.3, 0, 1), (0, 0), 2.0)  # umbral suave + borde difuminado
        borde.append(float(np.mean((m > 0.1) & (m < 0.9))))  # fracción de píxeles "indecisos" (borde sucio)
        rgba = np.dstack([f, (m * 255).astype(np.uint8)])
        cv2.imwrite(str(out / f"{n:04d}.png"), rgba)
        n += 1
    (out / "info.json").write_text(json.dumps({"fps": fps, "n": n, "borde_indeciso_medio": round(float(np.mean(borde)), 4)}))
    print(f"recorte: {n} cuadros a {fps:.0f} fps, borde indeciso {np.mean(borde)*100:.1f}%")

if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]))
