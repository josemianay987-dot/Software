"""
Motor OMR (Optical Mark Recognition) para hojas de respuestas KNOWTIFY.

Lee las burbujas A/B/C/D marcadas y recorta la franja del NOMBRE manuscrito
para que la IA de visión identifique al estudiante automáticamente
emparejándolo contra la lista de la clase.

Flujo:
  1. Decodifica imagen (o renderiza página de PDF con PyMuPDF).
  2. Detecta los 4 cuadrados fiduciales de las esquinas.
  3. Corrige la perspectiva (warp) a un lienzo normalizado.
  4. Recorta la franja del nombre (para identificación por IA).
  5. Mide el relleno de cada burbuja de respuesta.
  6. Devuelve {name_img, answers} por hoja.

La MISMA geometría (este archivo) genera la plantilla imprimible, de modo
que lector y plantilla siempre están sincronizados.
"""
from __future__ import annotations
import numpy as np
import cv2

# ── Geometría del lienzo normalizado (proporción A4 vertical) ──────────
SHEET_W = 1000
SHEET_H = 1414

MARGIN = 55
FIDUCIAL = 46
FIDUCIAL_CENTERS = [
    (MARGIN + FIDUCIAL / 2, MARGIN + FIDUCIAL / 2),
    (SHEET_W - MARGIN - FIDUCIAL / 2, MARGIN + FIDUCIAL / 2),
    (SHEET_W - MARGIN - FIDUCIAL / 2, SHEET_H - MARGIN - FIDUCIAL / 2),
    (MARGIN + FIDUCIAL / 2, SHEET_H - MARGIN - FIDUCIAL / 2),
]

# ── Franja del NOMBRE (identificación por IA de visión) ───────────────
NAME_X0, NAME_X1 = 150, 900   # extremos horizontales de la caja del nombre
NAME_TOP, NAME_BOT = 198, 280  # extremos verticales de la caja del nombre

# ── Cuadrícula de RESPUESTAS ──────────────────────────────────────────
GRID_TOP = 380         # y de la primera fila de respuestas (debajo del nombre)
ROW_H = 50
BUBBLE_R = 16
OPT_GAP = 64
PER_COLUMN = 15
COL_X = [150, 580]
OPT_OFFSET = 58

OPTION_LETTERS = ["A", "B", "C", "D", "E"]


def bubble_centers(num_q: int, num_opts: int = 4):
    """{ q(1-indexed): [(x,y) por cada opción] } en el lienzo normalizado."""
    centers: dict[int, list[tuple[float, float]]] = {}
    for i in range(num_q):
        col = i // PER_COLUMN
        row = i % PER_COLUMN
        if col >= len(COL_X):
            break
        base_x = COL_X[col]
        y = GRID_TOP + row * ROW_H
        centers[i + 1] = [(base_x + OPT_OFFSET + j * OPT_GAP, y) for j in range(num_opts)]
    return centers


def name_region(warped: np.ndarray) -> bytes:
    """Recorta la franja del NOMBRE del lienzo normalizado y la devuelve como PNG.
    Se envía a la IA de visión para identificar al estudiante por su nombre escrito."""
    h, w = warped.shape[:2]
    pad = 4
    y0 = max(0, NAME_TOP + pad)
    y1 = min(h, NAME_BOT - pad)
    x0 = max(0, NAME_X0 + pad)
    x1 = min(w, NAME_X1 - pad)
    crop = warped[y0:y1, x0:x1]
    ok, png = cv2.imencode(".png", crop)
    return png.tobytes() if ok else b""


# ====================================================================
# LECTURA
# ====================================================================
def _find_fiducials(gray: np.ndarray):
    h, w = gray.shape
    img_area = h * w
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel)
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel)
    cnts, _ = cv2.findContours(th, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for c in cnts:
        area = cv2.contourArea(c)
        if area < img_area * 0.00015 or area > img_area * 0.03:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.05 * peri, True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        (cx, cy), (rw, rh), _ = cv2.minAreaRect(approx)
        if rw == 0 or rh == 0:
            continue
        if max(rw, rh) / min(rw, rh) > 1.45:
            continue
        if (area / (rw * rh)) < 0.75:
            continue
        candidates.append((cx, cy, area))

    if len(candidates) < 4:
        return None
    corners = [(0, 0), (w, 0), (w, h), (0, h)]
    chosen, used = [], set()
    for corner in corners:
        best, best_d = None, 1e18
        for idx, (cx, cy, _) in enumerate(candidates):
            if idx in used:
                continue
            d = (cx - corner[0]) ** 2 + (cy - corner[1]) ** 2
            if d < best_d:
                best_d, best = d, idx
        if best is None:
            return None
        used.add(best)
        chosen.append((candidates[best][0], candidates[best][1]))
    return np.array(chosen, dtype="float32")


def _warp_to_canvas(gray: np.ndarray):
    fids = _find_fiducials(gray)
    dst = np.array(FIDUCIAL_CENTERS, dtype="float32")
    if fids is not None:
        M = cv2.getPerspectiveTransform(fids, dst)
        return cv2.warpPerspective(gray, M, (SHEET_W, SHEET_H)), True
    return cv2.resize(gray, (SHEET_W, SHEET_H)), False


def _fill_ratio(bin_img: np.ndarray, cx: float, cy: float, r: int) -> float:
    x0, y0 = max(0, int(cx - r)), max(0, int(cy - r))
    x1 = min(bin_img.shape[1], int(cx + r))
    y1 = min(bin_img.shape[0], int(cy + r))
    if x1 <= x0 or y1 <= y0:
        return 0.0
    roi = bin_img[y0:y1, x0:x1]
    mask = np.zeros(roi.shape, dtype=np.uint8)
    cv2.circle(mask, (roi.shape[1] // 2, roi.shape[0] // 2), max(1, r - 2), 255, -1)
    total = cv2.countNonZero(mask)
    if total == 0:
        return 0.0
    filled = cv2.countNonZero(cv2.bitwise_and(roi, roi, mask=mask))
    return filled / float(total)


def read_marks(file_bytes: bytes, content_type: str, num_q: int, num_opts: int = 4):
    """
    Devuelve por hoja:
      { "page", "answers": {q: "A"|None}, "name_img": <png bytes>, "aligned": bool }
    """
    pages = _load_pages(file_bytes, content_type)
    results = []
    for i, gray in enumerate(pages):
        warped, aligned = _warp_to_canvas(gray)
        bin_img = cv2.adaptiveThreshold(
            warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 35, 15,
        )
        name_img = name_region(warped)
        centers = bubble_centers(num_q, num_opts)
        answers: dict[int, str | None] = {}
        for q, opts in centers.items():
            ratios = [_fill_ratio(bin_img, cx, cy, BUBBLE_R) for (cx, cy) in opts]
            best = int(np.argmax(ratios))
            best_val = ratios[best]
            second = sorted(ratios, reverse=True)[1] if len(ratios) > 1 else 0
            answers[q] = OPTION_LETTERS[best] if (best_val >= 0.35 and (best_val - second) >= 0.12) else None
        results.append({"page": i + 1, "answers": answers, "name_img": name_img, "aligned": aligned})
    return results


def _load_pages(file_bytes: bytes, content_type: str) -> list[np.ndarray]:
    ct = (content_type or "").lower()
    if "pdf" in ct:
        import fitz
        pages = []
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_RGB2GRAY) if pix.n >= 3 else img[:, :, 0]
            pages.append(gray)
        doc.close()
        return pages
    arr = np.frombuffer(file_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    return [img]


# ====================================================================
# GENERACIÓN DE LA PLANTILLA IMPRIMIBLE (PDF)
# ====================================================================
def render_answer_sheet(num_q: int = 25, num_opts: int = 4, title: str = "KNOWTIFY") -> bytes:
    canvas = np.full((SHEET_H, SHEET_W), 255, dtype=np.uint8)
    F = cv2.FONT_HERSHEY_SIMPLEX

    # Fiduciales
    for (cx, cy) in FIDUCIAL_CENTERS:
        cv2.rectangle(
            canvas,
            (int(cx - FIDUCIAL / 2), int(cy - FIDUCIAL / 2)),
            (int(cx + FIDUCIAL / 2), int(cy + FIDUCIAL / 2)),
            0, -1,
        )

    # Título
    cv2.putText(canvas, f"{title} - Hoja de respuestas", (150, 135), F, 1.0, 0, 2, cv2.LINE_AA)

    # --- NOMBRE (caja amplia para escritura legible) ---
    cv2.putText(canvas, "NOMBRE Y APELLIDOS (escribe en letra clara):", (NAME_X0, 180),
                F, 0.6, 0, 2, cv2.LINE_AA)
    cv2.rectangle(canvas, (NAME_X0, NAME_TOP), (NAME_X1, NAME_BOT), 0, 1)

    # --- Respuestas ---
    cv2.putText(canvas, "RESPUESTAS", (150, GRID_TOP - 40), F, 0.6, 0, 2, cv2.LINE_AA)
    centers = bubble_centers(num_q, num_opts)
    for q, opts in centers.items():
        first_x = opts[0][0]
        y = int(opts[0][1])
        cv2.putText(canvas, f"{q:>2}", (int(first_x - 52), y + 7), F, 0.6, 0, 2, cv2.LINE_AA)
        for j, (cx, cy) in enumerate(opts):
            cv2.circle(canvas, (int(cx), int(cy)), BUBBLE_R, 0, 2)
            cv2.putText(canvas, OPTION_LETTERS[j], (int(cx - 7), int(cy + 6)), F, 0.5, 0, 1, cv2.LINE_AA)

    cv2.putText(canvas, "Rellena completamente la burbuja. Escribe tu nombre completo arriba.",
                (150, SHEET_H - 90), F, 0.6, 0, 1, cv2.LINE_AA)

    import fitz
    ok, png = cv2.imencode(".png", canvas)
    if not ok:
        raise RuntimeError("No se pudo renderizar la hoja")
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(fitz.Rect(0, 0, 595, 842), stream=png.tobytes())
    out = doc.tobytes()
    doc.close()
    return out
