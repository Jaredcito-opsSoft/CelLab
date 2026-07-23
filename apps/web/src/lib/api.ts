const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getPublicInfo() {
  const response = await fetch(`${API_URL}/api/public`);
  if (!response.ok) throw new Error('No fue posible cargar la información pública.');
  return response.json();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({})) as {
    error?: string;
    code?: string;
  };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('localpos:unauthorized'));
    }
    throw new ApiError(
      data.error ?? 'No fue posible completar la operación.',
      response.status,
      data.code,
    );
  }
  return data as T;
}
