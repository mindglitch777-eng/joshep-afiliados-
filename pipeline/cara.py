"""Seguimiento de cara con MediaPipe sobre work/cortado.mp4 → work/cara.json (normalizado 0-1).
Con 2+ caras elige la mayor que además siga a la anterior (continuidad). Sin cara: lista vacía = centrado."""
import json
import cv2
import mediapipe as mp
from comun import WORK, guardar

MUESTRAS_FPS = 6

def main():
    cap = cv2.VideoCapture(str(WORK / "cortado.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    paso = max(1, round(fps / MUESTRAS_FPS))
    det = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
    out, previa, i, total, multi = [], None, 0, 0, 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % paso == 0:
            total += 1
            r = det.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            caras = [d.location_data.relative_bounding_box for d in (r.detections or [])]
            if len(caras) > 1:
                multi += 1
            if caras:
                def score(b):
                    area = b.width * b.height
                    if previa is None:
                        return area
                    dist = abs(b.xmin + b.width / 2 - previa["x"]) + abs(b.ymin + b.height / 2 - previa["y"])
                    return area - dist * 0.5
                b = max(caras, key=score)
                previa = {"t": round(i / fps, 3), "x": b.xmin + b.width / 2, "y": b.ymin + b.height / 2, "w": b.width, "h": b.height}
                out.append({k: round(v, 4) for k, v in previa.items()})
        i += 1
    cobertura = len(out) / max(total, 1)
    guardar(WORK / "cara.json", out)
    avisos = []
    if cobertura < 0.3:
        avisos.append(f"No se detectó cara en la mayoría del clip (cobertura {cobertura*100:.0f}%): se usa encuadre centrado.")
        guardar(WORK / "cara.json", [])
    if multi:
        avisos.append(f"Hubo {multi} muestras con 2 o más caras: se siguió la mayor con continuidad.")
    guardar(WORK / "cara_info.json", {"cobertura": round(cobertura, 3), "muestras": total, "avisos": avisos})
    print(json.dumps({"cobertura": cobertura, "avisos": avisos}, ensure_ascii=False))

if __name__ == "__main__":
    main()
