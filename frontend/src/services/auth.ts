import type { AuthResponse, User } from "../types";
import { request } from "./api";

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const authApi = {
  register: (data: RegisterPayload) => request<AuthResponse>("/auth/register/", { method: "POST", body: data }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login/", { method: "POST", body: { email, password } }),
  logout: () => request<void>("/auth/logout/", { method: "POST" }),
  me: () => request<User>("/auth/me/"),
  updateMe: (patch: Partial<User>) => request<User>("/auth/me/", { method: "PATCH", body: patch }),
};
