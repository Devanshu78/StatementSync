import { http } from "./http";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload) {
  const { data } = await http.post("/auth/register", payload);
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await http.post("/auth/login", { email, password });
  return data;
}

export async function logout() {
  const { data } = await http.post("/auth/logout");
  return data;
}

// The server has helpers verifyUser/getUser but not routed; adjust if added later
export async function getPersonalInfo() {
  // Attempt cookie-based identity via a lightweight ping if available later
  // For now, return null to keep API surface consistent
  return null as unknown as { id: string; name?: string; email: string } | null;
}

export async function updateSettings(_settings: Record<string, unknown>) {
  // Placeholder: no endpoint defined server-side yet
  return { ok: true };
}


