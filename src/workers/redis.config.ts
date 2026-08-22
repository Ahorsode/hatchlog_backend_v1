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
    // BullMQ requires null; a number makes the worker throw/reconnect in a tight loop.
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      // Missing Redis must not pin a 1-vCPU droplet at 100% CPU.
      return Math.min(200 * times, 5000);
    },
  };
}
