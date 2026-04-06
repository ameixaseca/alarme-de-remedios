import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '@dailymed/shared/types';

const ACCESS_TOKEN_KEY = 'dailymed_access_token';
const REFRESH_TOKEN_KEY = 'dailymed_refresh_token';
const USER_KEY = 'dailymed_user';

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
  return url.replace(/\/$/, '');
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthTokens['user'] | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        setIsAuthenticated(true);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error ?? 'Falha no login');
    }

    const data: AuthTokens = await res.json();
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
    router.replace('/(app)');
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error ?? 'Falha no cadastro');
    }

    const data: AuthTokens = await res.json();
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
    router.replace('/(app)');
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) {
        await fetch(`${getBaseUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/(auth)/login');
    }
  }, []);

  return { isAuthenticated, isLoading, user, login, register, logout };
}
