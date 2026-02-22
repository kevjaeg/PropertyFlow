const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  async fetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await globalThis.fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }
    return res.json();
  }

  post(path: string, body: unknown) {
    return this.fetch(path, { method: "POST", body: JSON.stringify(body) });
  }

  put(path: string, body: unknown) {
    return this.fetch(path, { method: "PUT", body: JSON.stringify(body) });
  }

  patch(path: string, body: unknown) {
    return this.fetch(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  delete(path: string) {
    return this.fetch(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();
