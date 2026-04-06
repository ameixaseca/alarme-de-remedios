const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Try to refresh
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("access_token", data.accessToken);
        localStorage.setItem("refresh_token", data.refreshToken);
        // Retry original request
        const retryRes = await fetch(`${BASE}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.accessToken}`,
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) throw new Error((await retryRes.json()).error || "Request failed");
        return retryRes.json();
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
