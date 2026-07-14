import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, PaginatedResponse } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("staffAccessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("staffRefreshToken");
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_URL}/auth/refresh`,
      { refreshToken }
    );
    if (data.data?.accessToken) {
      localStorage.setItem("staffAccessToken", data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem("staffRefreshToken", data.data.refreshToken);
      }
      return data.data.accessToken;
    }
  } catch {
    localStorage.removeItem("staffAccessToken");
    localStorage.removeItem("staffRefreshToken");
    localStorage.removeItem("staffUser");
    localStorage.removeItem("staffExpert");
  }
  return null;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function cleanParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<T>>(url, { params: cleanParams(params) });
  return data;
}

export async function apiGetPaginated<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<PaginatedResponse<T>>(url, { params: cleanParams(params) });
  return data;
}

export async function apiPost<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPut<T>(url: string, body?: unknown) {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data;
}

export async function apiUpload<T>(url: string, formData: FormData) {
  const { data } = await api.post<ApiResponse<T>>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
