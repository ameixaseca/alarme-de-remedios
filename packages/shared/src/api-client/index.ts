import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'dailymed_access_token';
const REFRESH_TOKEN_KEY = 'dailymed_refresh_token';

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL is not set');
  return url.replace(/\/$/, '');
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

type OnUnauthorized = () => void;
let onUnauthorizedCallback: OnUnauthorized | null = null;

export function setOnUnauthorized(cb: OnUnauthorized): void {
  onUnauthorizedCallback = cb;
}

async function refreshTokens(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    onUnauthorizedCallback?.();
    return null;
  }

  const data = await res.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshTokens();
    if (!newToken) throw new Error('Unauthorized');

    headers['Authorization'] = `Bearer ${newToken}`;
    const retry = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({ error: 'Unknown error' }));
      throw Object.assign(new Error(err.error ?? 'Request failed'), { status: retry.status });
    }
    return retry.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status });
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
