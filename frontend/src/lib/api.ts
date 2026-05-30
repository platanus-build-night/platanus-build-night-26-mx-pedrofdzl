const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "ditto.access";
const REFRESH_KEY = "ditto.refresh";

export const tokens = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(extractMessage(data) ?? `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  const first = Object.values(obj)[0];
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  if (typeof first === "string") return first;
  return null;
}

async function parse(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type Options = RequestInit & { auth?: boolean; retry?: boolean };

export async function api<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  const { auth = true, retry = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (rest.body && !(rest.body instanceof FormData) && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth && tokens.access) {
    finalHeaders.set("Authorization", `Bearer ${tokens.access}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (res.status === 401 && auth && retry && tokens.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, { ...options, retry: false });
  }

  const data = await parse(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await api<{ access: string }>("/auth/token/refresh/", {
      method: "POST",
      auth: false,
      retry: false,
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    tokens.set(data.access);
    return true;
  } catch {
    tokens.clear();
    return false;
  }
}
