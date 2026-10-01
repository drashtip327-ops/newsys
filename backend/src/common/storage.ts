import { del, get, put } from '@vercel/blob';
export const storageKind = () => process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? 'redis' : 'local';
export const storageConfigured = () => storageKind() !== 'local';
const pathname = (key: string | number) => `newsys/${String(key).replaceAll(':', '/')}.json`;
async function readBlob(key: string | number) {
  // Bypass the CDN so settings updates and logout revocation are immediate.
  const blob = await get(pathname(key), { access: 'private', useCache: false });
  if (!blob) return null;
  const saved = await new Response(blob.stream).json() as { value: string; expires?: number };
  if (saved.expires && saved.expires <= Date.now()) { await del(pathname(key)); return null; }
  return saved.value;
}
export async function storageCommand<T = unknown>(...command: (string | number)[]): Promise<T> {
  if (storageKind() === 'blob') {
    const [operation, key, value, , ttl] = command;
    let result: unknown;
    if (operation === 'GET') result = await readBlob(key);
    else if (operation === 'MGET') result = await Promise.all(command.slice(1).map(readBlob));
    else if (operation === 'SET') {
      await put(pathname(key), JSON.stringify({ value, ...(ttl ? { expires: Date.now() + Number(ttl) } : {}) }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
      result = 'OK';
    } else if (operation === 'DEL') { await del(pathname(key)); result = 1; }
    else if (operation === 'PING') { await readBlob('newsys:config'); result = 'PONG'; }
    else throw new Error(`Unsupported storage operation ${operation}`);
    return result as T;
  }
  const response = await fetch(process.env.KV_REST_API_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Shared storage failed (${response.status})`);
  const result = await response.json() as { result: T; error?: string };
  if (result.error) throw new Error(result.error);
  return result.result;
}
