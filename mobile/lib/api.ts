import * as SecureStore from "expo-secure-store";

console.log("API BASE:", process.env.EXPO_PUBLIC_API_URL);

export const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";
let onLogout = () => {};
export const setOnLogout = (f: () => void) => (onLogout = f);

export const saveTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync("access", access);
  await SecureStore.setItemAsync("refresh", refresh);
};
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync("access");
  await SecureStore.deleteItemAsync("refresh");
};
export const hasSession = async () => !!(await SecureStore.getItemAsync("refresh"));

const send = (path: string, method: string, body?: unknown, token?: string | null) =>
  fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

export async function api<T = any>(path: string, method = "GET", body?: unknown, auth = true): Promise<T> {
  let res = await send(path, method, body, auth ? await SecureStore.getItemAsync("access") : null);
  if (auth && res.status === 401) {
    const refresh = await SecureStore.getItemAsync("refresh");
    const r = refresh ? await send("/api/auth/refresh/", "POST", { refresh }) : null;
    if (r?.ok) {
      const d = await r.json();
      await saveTokens(d.access, d.refresh ?? refresh!);
      res = await send(path, method, body, d.access);
    } else {
      await clearTokens(); onLogout();
      throw new Error("Session expired. Please sign in again.");
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail ?? Object.values(data).flat().join(" ");
    throw new Error(msg || "Something went wrong");
  }
  return data;
}
