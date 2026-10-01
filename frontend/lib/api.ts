const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';
export async function apiRequest<T>(endpoint: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again shortly.');
  }
  const result = await response.json() as { data: T; message?: string };
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !endpoint.startsWith('/auth/')) window.dispatchEvent(new Event('session-refresh'));
    throw new Error(result.message ?? 'The payment action failed.');
  }
  return result.data;
}
