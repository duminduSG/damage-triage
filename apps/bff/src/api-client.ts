export interface ApiClassification {
  damageType: string;
  severity: string;
  confidence: number;
  notes: string;
  provider: string;
}

export interface ApiClaim {
  id: string;
  reference: string;
  address: string;
  status: string;
  createdAt: string;
}

export interface ApiPhoto {
  id: string;
  claimId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  classification: ApiClassification;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
    if (res.status === 404) throw new ApiError(404, 'Not found');
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message.join('; ') : body.message;
      throw new ApiError(res.status, msg ?? `API responded ${res.status}`);
    }
    return (await res.json()) as T;
  }

  listClaims(limit: number) {
    return this.request<ApiClaim[]>(`/claims?limit=${limit}`);
  }

  async getClaim(id: string) {
    try {
      return await this.request<{ claim: ApiClaim; photos: ApiPhoto[] }>(`/claims/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }
  }

  createClaim(reference: string, address: string) {
    return this.request<ApiClaim>('/claims', {
      method: 'POST',
      body: JSON.stringify({ reference, address }),
    });
  }
}
