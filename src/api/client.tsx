import { storage } from "@/src/lib/storage";
import { getBaseUrl } from "./baseUrl";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  skipAuth?: boolean;
  isForm?: boolean;
};

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!text) return null;
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function friendlyErrorMessage(status: number, rawMessage: string): string {
  switch (status) {
    case 401:
      return "Session expired. Please sign in again.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "Not found.";
    case 500:
      return "Server error. Please try again later.";
    default:
      return rawMessage || `Request failed (${status})`;
  }
}

export function apiError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Unknown error";
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl(); // e.g. http://.../api
  const url = `${baseUrl}${normalizePath(path)}`;
  const method = opts.method ?? "GET";

  let token: string | null = null;
  if (!opts.skipAuth) {
    token = opts.token ?? (await storage.getToken());
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Token ${token}`;

  if (!opts.isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body:
      opts.body == null
        ? undefined
        : opts.isForm
          ? (opts.body as any)
          : JSON.stringify(opts.body),
  });

  const data = await parseBody(res);

  if (!res.ok) {
    const rawMessage =
      typeof data === "string"
        ? data
        : (data as any)?.detail
          ? String((data as any).detail)
          : JSON.stringify(data);

    const message = friendlyErrorMessage(res.status, rawMessage);
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const apiGet = <T,>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body });
export const apiPatch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body });
