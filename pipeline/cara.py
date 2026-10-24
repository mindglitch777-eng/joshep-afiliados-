"""Seguimiento de cara con MediaPipe Face Mesh (+ Hands) sobre work/cortado_base.mp4 → work/cara_base.json (0-1).
Por muestra: caja de la cara, ojos/boca/mentón/frente (y), apertura de ojos, mirada a cámara y mano sobre la boca.
Con 2+ caras elige la mayor que además siga a la anterior. Sin cara: lista vacía = centrado + aviso."""
import json
import cv2
import mediapipe as mp
from comun import WORK, asegurar_base, cfg, guardar

MUESTRAS_FPS = 6
FRANJA_BOCA = cfg("hook")["arranque"]["mano_boca_franja"]
_mesh = _hands = None

def detectores():
    global _mesh, _hands
    if _mesh is None:
        _mesh = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=3, refine_landmarks=True, min_detection_confidence=0.5)
        _hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5)
    return _mesh, _hands

def analizar_frame(frame, previa=None):
    """Devuelve dict normalizado de la cara elegida o None."""
    mesh, hands = detectores()
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    r = mesh.process(rgb)
    if not r.multi_face_landmarks:
        return None, 0
    caras = []
    for f in r.multi_face_landmarks:
        L = f.landmark
        xs, ys = [p.x for p in L], [p.y for p in L]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        caras.append((L, x0, x1, y0, y1))
    def score(c):
        _, x0, x1, y0, y1 = c
        area = (x1 - x0) * (y1 - y0)
        if previa is None:
            return area
        return area - 0.5 * (abs((x0 + x1) / 2 - previa["x"]) + abs((y0 + y1) / 2 - previa["y"]))
    L, x0, x1, y0, y1 = max(caras, key=score)
    d = lambda a, b: ((L[a].x - L[b].x) ** 2 + (L[a].y - L[b].y) ** 2) ** 0.5
    ear = (d(159, 145) / max(d(33, 133), 1e-6) + d(386, 374) / max(d(362, 263), 1e-6)) / 2
    iris = lambda c, a, b: (L[c].x - L[a].x) / max(L[b].x - L[a].x, 1e-6)
    mirada = 1 - 2 * (abs(iris(468, 33, 133) - 0.5) + abs(iris(473, 362, 263) - 0.5)) / 2
    # mano sobre la boca: puntos de la mano en el 40% inferior de la caja de la cara
    mano = False
    rh = hands.process(rgb)
    for h in rh.multi_hand_landmarks or []:
        if any(x0 <= p.x <= x1 and y1 - FRANJA_BOCA * (y1 - y0) <= p.y <= y1 for p in h.landmark):
            mano = True
    out = {"x": (x0 + x1) / 2, "y": (y0 + y1) / 2, "w": x1 - x0, "h": y1 - y0,
           "frente": L[10].y, "ojos": (L[159].y + L[145].y + L[386].y + L[374].y) / 4,
           "boca": (L[13].y + L[14].y) / 2, "menton": L[152].y, "ear": ear, "mirada": max(0.0, mirada), "mano_boca": mano}
    return out, len(caras)

def main(video=None, salida=None, info=None):
    if video is None:
        asegurar_base()
    cap = cv2.VideoCapture(str(video or WORK / "cortado_base.mp4"))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    paso = max(1, round(fps / MUESTRAS_FPS))
    out, previa, i, total, multi = [], None, 0, 0, 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % paso == 0:
            total += 1
            c, n = analizar_frame(frame, previa)
            multi += n > 1
            if c:
                previa = c
                out.append({"t": round(i / fps, 3), **{k: (round(v, 4) if isinstance(v, float) else v) for k, v in c.items()}})
        i += 1
    cobertura = len(out) / max(total, 1)
    avisos = []
    if cobertura < 0.3:
        avisos.append(f"No se detectó cara en la mayoría del clip (cobertura {cobertura*100:.0f}%): se usa encuadre centrado.")
        out = []
    if multi:
        avisos.append(f"Hubo {multi} muestras con 2 o más caras: se siguió la mayor con continuidad.")
    guardar(salida or WORK / "cara_base.json", out)
    guardar(info or WORK / "cara_info.json", {"cobertura": round(cobertura, 3), "muestras": total, "avisos": avisos, "fps_video": fps})
    print(json.dumps({"cobertura": cobertura, "avisos": avisos}, ensure_ascii=False))

if __name__ == "__main__":
    main()
