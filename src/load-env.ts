import { loadEnvFile } from 'node:process';

// Must run before PrismaClient / BullMQ read process.env.
// PM2 --update-env from a CI SSH session often has no DATABASE_URL.
try {
  loadEnvFile('.env');
} catch {
  // Already injected by the shell after sourcing .env.
}
