/**
 * API client for the mobility backend (Raahi spec 09 contracts).
 * Raw JSON responses; errors use the { error: { code, message, requestId } }
 * envelope. Session ending on 401 is centralized here.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4500';

export const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection and try again.';

export class ApiError extends Error {
  readonly status: number | null;
  readonly code?: string;
  readonly requestId?: string;
  readonly isNetworkError: boolean;

  constructor(message: string, init: { status?: number | null; code?: string; requestId?: string; isNetworkError?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status ?? null;
    this.code = init.code;
    this.requestId = init.requestId;
    this.isNetworkError = init.isNetworkError ?? false;
  }
}

const TOKEN_KEY = 'mobility.admin.token';

export function getToken(): string | null {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null;
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable — in-memory usage still works for the session
  }
}

/** Registered by the session layer; invoked once on any 401 with a token. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  timeoutMs?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(method: string, endpoint: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { ...opts.headers };
    const token = opts.skipAuth ? null : getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const controller = opts.timeoutMs ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;

    let res: Response;
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      if (opts.params) {
        for (const [k, v] of Object.entries(opts.params)) {
          if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
        }
      }
      res = await fetch(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller?.signal,
      });
    } catch {
      throw new ApiError(NETWORK_ERROR_MESSAGE, { isNetworkError: true });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (res.status === 401 && token && onUnauthorized) {
      onUnauthorized();
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (res.ok) return undefined as T;
      throw new ApiError(`HTTP ${res.status}`, { status: res.status });
    }

    const body = await res.json();

    if (!res.ok) {
      // Spec 09 §7 envelope: { error: { code, message, requestId } }
      const err = body?.error ?? {};
      throw new ApiError(err.message || `HTTP ${res.status}`, {
        status: res.status,
        code: err.code,
        requestId: err.requestId,
      });
    }

    return body as T;
  }

  get<T>(endpoint: string, params?: Record<string, unknown>, opts?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, { params, ...opts });
  }
  post<T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, { body, ...opts });
  }
  patch<T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, { body, ...opts });
  }
  put<T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, { body, ...opts });
  }
  delete<T>(endpoint: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, opts);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
