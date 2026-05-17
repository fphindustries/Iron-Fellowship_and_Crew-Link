import { API_BASE_URL, api } from "../config/api.config";
import type { UserProfile } from "@starforged/shared";

export function loginWithGoogle() {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
}

export async function sendMagicEmailLink(email: string, displayName?: string): Promise<boolean> {
  await api.post("/api/auth/magic-link/send", { email, displayName });
  window.localStorage.setItem("auth-email", email);
  return true;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function getUser(): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function updateUser(patch: Partial<UserProfile>): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  await api.patch(`/api/users/${user.id}`, patch);
}

export async function loginWithToken(token: string): Promise<void> {
  await api.post("/api/auth/magic-link/verify", { token });
}
