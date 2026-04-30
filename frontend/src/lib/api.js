// Cliente HTTP central. Inyecta el JWT, normaliza errores y dispara
// logout automático en 401. Todas las llamadas al backend deben pasar por aquí.

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "mocavi_token";
const SESSION_KEY = "mocavi_session";
const STUDENT_KEY = "mocavi_student";
const USER_KEY = "mocavi_user";

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem(USER_KEY);
}

// Aviso al árbol React vía evento. Las páginas que escuchan redirigen al login.
function emitUnauthorized() {
  if (typeof window === "undefined") return;
  clearSession();
  window.dispatchEvent(new CustomEvent("mocavi:unauthorized"));
}

async function request(path, { method = "GET", body, headers = {}, signal, isForm = false } = {}) {
  const finalHeaders = { ...headers };
  const token = getToken();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body !== undefined && !isForm) {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
    payload = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers: finalHeaders, body: payload, signal });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Error de red. Verifica que el backend esté activo.", { status: 0 });
  }

  if (res.status === 401) {
    emitUnauthorized();
    throw new ApiError("Sesión expirada", { status: 401 });
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText || "Error";
    throw new ApiError(typeof detail === "string" ? detail : "Error", { status: res.status, data });
  }
  return data;
}

export const api = {
  get:  (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put:  (path, body, opts) => request(path, { ...opts, method: "PUT",  body }),
  del:  (path, opts) => request(path, { ...opts, method: "DELETE" }),
  // Para multipart/form-data (sin Content-Type manual: lo pone el navegador con boundary)
  postForm: (path, formData, opts) => request(path, { ...opts, method: "POST", body: formData, isForm: true }),
};

export function isLoggedIn() {
  return !!getToken();
}
