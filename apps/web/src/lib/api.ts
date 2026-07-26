const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const CONNECTION_EVENT = 'localpos:connection';
let apiReachable = typeof navigator === 'undefined' ? true : navigator.onLine;

function setConnection(value: boolean) {
  if (apiReachable === value) return;
  apiReachable = value;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONNECTION_EVENT, { detail: value }));
}

export function connectionSnapshot() {
  return (typeof navigator === 'undefined' || navigator.onLine) && apiReachable;
}

export function subscribeConnection(listener: (online: boolean) => void) {
  const sync = () => {
    if (!navigator.onLine) {
      setConnection(false);
      listener(false);
      return;
    }
    void checkApiConnection().then(listener);
  };
  const custom = () => listener(connectionSnapshot());
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  window.addEventListener(CONNECTION_EVENT, custom);
  sync();
  return () => {
    window.removeEventListener('online', sync);
    window.removeEventListener('offline', sync);
    window.removeEventListener(CONNECTION_EVENT, custom);
  };
}

export async function checkApiConnection() {
  if (!navigator.onLine) {
    setConnection(false);
    return false;
  }
  try {
    const response = await fetch(`${API_URL}/health/ready`, { cache: 'no-store' });
    setConnection(response.ok);
    return response.ok;
  } catch {
    setConnection(false);
    return false;
  }
}

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
  const response = await fetch(`${API_URL}/api/public`, { cache: 'no-store' });
  if (!response.ok) throw new Error('No fue posible cargar la información pública.');
  return response.json();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (mutation && !connectionSnapshot()) {
    throw new ApiError('Sin conexión. Reconecta LocalPOS antes de registrar cambios.', 0, 'OFFLINE');
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    setConnection(true);
  } catch {
    setConnection(false);
    throw new ApiError('No fue posible conectar con LocalPOS. Revisa tu internet e intenta nuevamente.', 0, 'NETWORK_UNAVAILABLE');
  }
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
