import { http } from "./http";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
export interface User {
  id: string;
  name: string;
  email: string;  
}

export interface LoginResponse {
  ok: boolean;
  user: User;
  token: string;
}

export async function register(payload: RegisterPayload) {
  const { data } = await http.post("/auth/register", payload);
  return data;
}

export async function login(email: string, password: string):Promise<LoginResponse>{
  const { data } = await http.post("/auth/login", { email, password });
  if(data.ok && data.user){
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

export async function logout() {
  const { data } = await http.post("/auth/logout");
  localStorage.removeItem("user");
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


