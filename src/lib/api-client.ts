export interface ApiUser {
  id: string;
  email: string;
  status: string;
}

export interface ApiProfile {
  id: string;
  userId: string;
  displayName: string;
  locale: string;
  timezone: string;
  bio: string | null;
  avatarUrl: string | null;
  updatedAt: string;
}

export interface ApiWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  role: string;
}

export interface ApiAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  status: 'success' | 'failure';
  details_json: string | null;
  ip_address: string | null;
  created_at: string;
}

class ApiClient {
  private csrfToken: string | null = null;

  public async getCsrfToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    const res = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      this.csrfToken = data.csrfToken;
      return this.csrfToken || '';
    }
    return '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // Para requisições mutadoras, anexar o cabeçalho X-OnlyOne-CSRF
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      const csrf = await this.getCsrfToken();
      if (csrf) {
        headers.set('x-onlyone-csrf', csrf);
      }
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include', // Assegura envio e recepção de cookies HttpOnly sem tocar no localStorage
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `Erro de rede ou operação inválida (${response.status})`;
      const error = new Error(message) as any;
      error.status = response.status;
      error.code = data?.error?.code;
      throw error;
    }

    return data as T;
  }

  public async register(payload: { email: string; password: string; displayName: string }) {
    return this.request<{ user: ApiUser; profile: ApiProfile; workspace: ApiWorkspace }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: { email: string; password: string }) {
    return this.request<{ user: ApiUser; profile: ApiProfile; workspace: ApiWorkspace }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async logout() {
    return this.request<{ success: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  public async getMe() {
    return this.request<{ userId: string; email: string; status: string; memberSince: string; profile: ApiProfile }>('/api/v1/users/me');
  }

  public async updateProfile(payload: { displayName?: string; bio?: string; locale?: string; timezone?: string }) {
    return this.request<{ userId: string; email: string; profile: ApiProfile }>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async getPersonalWorkspace() {
    return this.request<ApiWorkspace>('/api/v1/workspaces/me');
  }

  public async getAuditLogs(limit: number = 30) {
    return this.request<{ logs: ApiAuditLog[] }>(`/api/v1/audit/me?limit=${limit}`);
  }

  public async getHealth() {
    return this.request<{ status: string; timestamp: string }>('/api/v1/health');
  }
}

export const api = new ApiClient();
