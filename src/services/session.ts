/**
 * Minimal session store for the ops dashboard.
 * useSyncExternalStore-compatible; `authenticated` only after a verified
 * token (login response or /auth/me), never because a token string exists.
 */

import { apiClient, setUnauthorizedHandler, setToken, getToken } from './apiClient';

export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface SessionUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: string;
  permissions: string[];
}

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

let state: SessionState = { status: 'checking', user: null };
const listeners = new Set<() => void>();

function setState(next: Partial<SessionState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const sessionStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): SessionState {
    return state;
  },
};

setUnauthorizedHandler(() => {
  if (state.status === 'authenticated') {
    setToken(null);
    setState({ status: 'unauthenticated', user: null });
  }
});

export async function login(phone: string, password: string): Promise<SessionUser> {
  const res = await apiClient.post<{ accessToken: string; user: { id: string; role: string; fullName: string | null }; permissions: string[] }>(
    '/api/v1/auth/admin/login',
    { phone, password },
  );
  setToken(res.accessToken);
  const user: SessionUser = {
    id: res.user.id,
    phone,
    fullName: res.user.fullName,
    role: res.user.role,
    permissions: res.permissions,
  };
  setState({ status: 'authenticated', user });
  return user;
}

/** Restore: verify the stored token against /auth/me (never trust storage). */
export async function restore(): Promise<void> {
  if (!getToken()) {
    setState({ status: 'unauthenticated', user: null });
    return;
  }
  try {
    const me = await apiClient.get<{ id: string; phone: string; fullName: string | null; role: string; permissions: string[] }>(
      '/api/v1/auth/me',
    );
    setState({
      status: 'authenticated',
      user: { id: me.id, phone: me.phone, fullName: me.fullName, role: me.role, permissions: me.permissions },
    });
  } catch {
    setToken(null);
    setState({ status: 'unauthenticated', user: null });
  }
}

export function logout(): void {
  setToken(null);
  setState({ status: 'unauthenticated', user: null });
}

export function hasPermission(permission: string): boolean {
  return state.user?.permissions.includes(permission) ?? false;
}
