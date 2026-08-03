import { URL } from 'node:url';

export function redisConnectionFromUrl(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const dbPath = parsed.pathname.replace('/', '');
  const db = dbPath ? Number(dbPath) : 0;

  return {
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isFinite(db) ? db : 0,
  };
}
