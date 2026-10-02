export const API_URL: string = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");

const TOKEN_KEY = "parcel_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length ? firstMessage(value[0]) : null;
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      const m = firstMessage(v);
      if (m) return m;
    }
  }
  return null;
}

function fieldErrorsOf(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      const m = firstMessage(value);
      if (m) out[key] = m;
    }
  }
  return out;
}

type Params = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params?: Params): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Params;
}

export async function request<T>(path: string, { method = "GET", body, params }: RequestOptions = {}): Promise<T> {
  const query = buildQuery(params);
  const url = `${API_URL}${path}${query ? `?${query}` : ""}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Token ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; 
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and that the backend is running.");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      tokenStore.clear();
      unauthorizedHandler?.();
    }
    const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : null;
    const message =
      (typeof detail === "string" && detail) || firstMessage(data) || `Request failed (${response.status}).`;
    throw new ApiError(response.status, message, fieldErrorsOf(data));
  }
  return data as T;
}
