const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function getToken() {
  return localStorage.getItem("zl_token") ?? "";
}

export function setToken(token: string) {
  localStorage.setItem("zl_token", token);
}

export function clearToken() {
  localStorage.removeItem("zl_token");
  localStorage.removeItem("zl_user");
  localStorage.removeItem("zl_store");
}

export async function api<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export { API };
