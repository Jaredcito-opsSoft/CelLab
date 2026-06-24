const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export async function getPublicInfo() {
  const response = await fetch(`${API_URL}/api/public`);
  if (!response.ok) throw new Error('No fue posible cargar la información pública.');
  return response.json();
}
export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'No fue posible completar la operación.');
  return data as T;
}
