"""
Motor OMR (Optical Mark Recognition) para hojas de respuestas KNOWTIFY.

Lee burbujas A/B/C/D marcadas a lápiz/bolígrafo en una hoja de respuestas
estándar, sin IA, en milisegundos y offline.

Flujo:
  1. Decodifica imagen (o renderiza página de PDF con PyMuPDF).
  2. Detecta los 4 cuadrados fiduciales de las esquinas.
  3. Corrige la perspectiva (warp) a un lienzo normalizado.
  4. Mide el relleno de cada burbuja según una geometría conocida.
  5. Devuelve {pregunta: "A"|"B"|"C"|"D"|None}.

La MISMA geometría (este archivo) genera la plantilla imprimible, de modo
que lector y plantilla siempre están sincronizados.
"""
from __future__ import annotations
import io
import numpy as np
import cv2

# ── Geometría del lienzo normalizado (proporción A4 vertical) ──────────
SHEET_W = 1000
SHEET_H = 1414

MARGIN = 55
FIDUCIAL = 46          # lado del cuadrado fiducial
# Centros teóricos de los 4 fiduciales (TL, TR, BR, BL)
FIDUCIAL_CENTERS = [
    (MARGIN + FIDUCIAL / 2, MARGIN + FIDUCIAL / 2),
    (SHEET_W - MARGIN - FIDUCIAL / 2, MARGIN + FIDUCIAL / 2),
    (SHEET_W - MARGIN - FIDUCIAL / 2, SHEET_H - MARGIN - FIDUCIAL / 2),
    (MARGIN + FIDUCIAL / 2, SHEET_H - MARGIN - FIDUCIAL / 2),
]

# Zona de la cuadrícula de burbujas
GRID_TOP = 360         # y donde empieza la primera fila de burbujas
ROW_H = 62             # separación vertical entre preguntas
BUBBLE_R = 16          # radio de cada burbuja
OPT_GAP = 64           # separación horizontal entre opciones A,B,C,D
PER_COLUMN = 15        # preguntas por columna antes de saltar a la siguiente
COL_X = [150, 580]     # x base de cada columna (donde empieza el nº de pregunta)
OPT_OFFSET = 58        # desde el x base hasta la 1ª burbuja

OPTION_LETTERS = ["A", "B", "C", "D", "E"]


def bubble_centers(num_q: int, num_opts: int = 4):
    """
    Devuelve { q(1-indexed): [(x,y) por cada opción] } en coordenadas del
    lienzo normalizado. Usado tanto por el lector como por el generador.
    """
    centers: dict[int, list[tuple[float, float]]] = {}
    for i in range(num_q):
        col = i // PER_COLUMN
        row = i % PER_COLUMN
        if col >= len(COL_X):
            break  # no caben más columnas
        base_x = COL_X[col]
        y = GRID_TOP + row * ROW_H
        opts = []
        for j in range(num_opts):
            x = base_x + OPT_OFFSET + j * OPT_GAP
            opts.append((x, y))
        centers[i + 1] = opts
    return centers


# ====================================================================
# LECTURA
# ====================================================================
def _order_points(pts: np.ndarray) -> np.ndarray:
    """Ordena 4 puntos como TL, TR, BR, BL."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # TL: menor x+y
    rect[2] = pts[np.argmax(s)]   # BR: mayor x+y
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # TR: menor y-x
    rect[3] = pts[np.argmax(diff)]  # BL
    return rect


def _find_fiducials(gray: np.ndarray):
    """
    Busca 4 cuadrados negros (uno por esquina). Tolera perspectiva (los
    cuadrados se ven como trapecios), ruido y fondo no blanco.
    Devuelve sus centros ordenados TL,TR,BR,BL o None.
    """
    h, w = gray.shape
    img_area = h * w

    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    # Cerrar huecos por ruido/JPEG dentro de los cuadrados
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
        # minAreaRect da el rectángulo rotado real → aspect ratio fiable
        (cx, cy), (rw, rh), _ = cv2.minAreaRect(approx)
        if rw == 0 or rh == 0:
            continue
        ar = max(rw, rh) / min(rw, rh)
        if ar > 1.45:  # no es cuadrado
            continue
        rect_area = rw * rh
        solidity = area / rect_area if rect_area > 0 else 0
        if solidity < 0.75:
            continue
        candidates.append((cx, cy, area))

    if len(candidates) < 4:
        return None

    # Asignar el candidato más cercano a cada esquina de la imagen
    corners = [(0, 0), (w, 0), (w, h), (0, h)]
    chosen = []
    used = set()
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
    """Corrige perspectiva usando fiduciales; si fallan, reescala directo."""
    fids = _find_fiducials(gray)
    dst = np.array([
        FIDUCIAL_CENTERS[0], FIDUCIAL_CENTERS[1],
        FIDUCIAL_CENTERS[2], FIDUCIAL_CENTERS[3],
    ], dtype="float32")
    if fids is not None:
        M = cv2.getPerspectiveTransform(fids, dst)
        return cv2.warpPerspective(gray, M, (SHEET_W, SHEET_H)), True
    # Fallback: asumir hoja ya recta, solo reescalar
    return cv2.resize(gray, (SHEET_W, SHEET_H)), False


def _fill_ratio(bin_img: np.ndarray, cx: float, cy: float, r: int) -> float:
    """Proporción de píxeles oscuros (marcados) dentro de la burbuja."""
    x0, y0 = int(cx - r), int(cy - r)
    x1, y1 = int(cx + r), int(cy + r)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(bin_img.shape[1], x1), min(bin_img.shape[0], y1)
    if x1 <= x0 or y1 <= y0:
        return 0.0
    roi = bin_img[y0:y1, x0:x1]
    # máscara circular
    mask = np.zeros(roi.shape, dtype=np.uint8)
    cv2.circle(mask, (roi.shape[1] // 2, roi.shape[0] // 2), r - 2, 255, -1)
    total = cv2.countNonZero(mask)
    if total == 0:
        return 0.0
    filled = cv2.countNonZero(cv2.bitwise_and(roi, roi, mask=mask))
    return filled / float(total)


def read_marks(file_bytes: bytes, content_type: str, num_q: int, num_opts: int = 4):
    """
    Lee TODAS las páginas (si es PDF) o la imagen, y devuelve una lista de
    resultados por hoja:
        [{ "page": 1, "answers": {1:"A", 2:"C", ...}, "aligned": True }]
    """
    pages = _load_pages(file_bytes, content_type)
    results = []
    for i, gray in enumerate(pages):
        warped, aligned = _warp_to_canvas(gray)
        # Binarizar: marcas oscuras → blanco (255)
        bin_img = cv2.adaptiveThreshold(
            warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 35, 15,
        )
        centers = bubble_centers(num_q, num_opts)
        answers: dict[int, str | None] = {}
        for q, opts in centers.items():
            ratios = [_fill_ratio(bin_img, cx, cy, BUBBLE_R) for (cx, cy) in opts]
            best = int(np.argmax(ratios))
            best_val = ratios[best]
            second = sorted(ratios, reverse=True)[1] if len(ratios) > 1 else 0
            # marcada si supera umbral y destaca sobre la segunda
            if best_val >= 0.35 and (best_val - second) >= 0.12:
                answers[q] = OPTION_LETTERS[best]
            else:
                answers[q] = None
        results.append({"page": i + 1, "answers": answers, "aligned": aligned})
    return results


def _load_pages(file_bytes: bytes, content_type: str) -> list[np.ndarray]:
    """Devuelve lista de imágenes en escala de grises (una por página)."""
    ct = (content_type or "").lower()
    if "pdf" in ct:
        import fitz  # PyMuPDF
        pages = []
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            # render a ~150 DPI para buena lectura sin pesar de más
            pix = page.get_pixmap(dpi=150)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            if pix.n >= 3:
                gray = cv2.cvtColor(img[:, :, :3], cv2.COLOR_RGB2GRAY)
            else:
                gray = img[:, :, 0]
            pages.append(gray)
        doc.close()
        return pages
    # Imagen simple
    arr = np.frombuffer(file_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    return [img]


# ====================================================================
# GENERACIÓN DE LA PLANTILLA IMPRIMIBLE (PDF)
# ====================================================================
def render_answer_sheet(num_q: int = 25, num_opts: int = 4, title: str = "KNOWTIFY") -> bytes:
    """
    Dibuja la hoja de respuestas estándar en el lienzo normalizado y la
    devuelve como PDF (A4) listo para imprimir. Usa la MISMA geometría que
    el lector, así que las burbujas quedan exactamente donde se esperan.
    """
    canvas = np.full((SHEET_H, SHEET_W), 255, dtype=np.uint8)

    # Fiduciales (cuadrados negros)
    for (cx, cy) in FIDUCIAL_CENTERS:
        x0, y0 = int(cx - FIDUCIAL / 2), int(cy - FIDUCIAL / 2)
        x1, y1 = int(cx + FIDUCIAL / 2), int(cy + FIDUCIAL / 2)
        cv2.rectangle(canvas, (x0, y0), (x1, y1), 0, -1)

    # Título
    cv2.putText(canvas, f"{title} - Hoja de respuestas", (150, 150),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, 0, 2, cv2.LINE_AA)
    # Líneas para nombre / documento
    cv2.putText(canvas, "Nombre:", (150, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, 0, 2, cv2.LINE_AA)
    cv2.line(canvas, (290, 232), (700, 232), 0, 1)
    cv2.putText(canvas, "Documento:", (150, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.7, 0, 2, cv2.LINE_AA)
    cv2.line(canvas, (350, 292), (700, 292), 0, 1)

    # Burbujas
    centers = bubble_centers(num_q, num_opts)
    for q, opts in centers.items():
        # número de pregunta a la izquierda de la fila
        first_x = opts[0][0]
        y = int(opts[0][1])
        cv2.putText(canvas, f"{q:>2}", (int(first_x - 52), y + 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, 0, 2, cv2.LINE_AA)
        for j, (cx, cy) in enumerate(opts):
            cv2.circle(canvas, (int(cx), int(cy)), BUBBLE_R, 0, 2)
            cv2.putText(canvas, OPTION_LETTERS[j], (int(cx - 7), int(cy + 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, 0, 1, cv2.LINE_AA)

    # Instrucción al pie
    cv2.putText(canvas, "Rellena completamente la burbuja de tu respuesta.",
                (150, SHEET_H - 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, 0, 1, cv2.LINE_AA)

    # Exportar a PDF con PyMuPDF
    import fitz
    ok, png = cv2.imencode(".png", canvas)
    if not ok:
        raise RuntimeError("No se pudo renderizar la hoja")
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 en puntos (72 dpi)
    rect = fitz.Rect(0, 0, 595, 842)
    page.insert_image(rect, stream=png.tobytes())
    out = doc.tobytes()
    doc.close()
    return out
