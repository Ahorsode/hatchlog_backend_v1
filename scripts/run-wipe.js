const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');

function readUrl(name) {
  const match = env.match(new RegExp(`^${name}=(.*)`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^"|"$/g, '');
}

const urls = [
  ['DATABASE_URL', readUrl('DATABASE_URL')],
  ['DIRECT_URL', readUrl('DIRECT_URL')],
].filter((entry) => Boolean(entry[1]));

if (urls.length === 0) {
  throw new Error('DATABASE_URL/DIRECT_URL is missing from hatchlog_backend/.env');
}

const COUNT_SQL = `
  SELECT 'public.users' AS name, COUNT(*)::bigint AS n FROM public.users
  UNION ALL SELECT 'public.farms', COUNT(*) FROM public.farms
  UNION ALL SELECT 'public.farm_members', COUNT(*) FROM public.farm_members
  UNION ALL SELECT 'public.batches', COUNT(*) FROM public.batches
  UNION ALL SELECT 'public.houses', COUNT(*) FROM public.houses
  UNION ALL SELECT 'public.invitations', COUNT(*) FROM public.invitations
  UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users
  UNION ALL SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
  UNION ALL SELECT 'storage.objects', COUNT(*) FROM storage.objects
  ORDER BY 1
`;

const WIPE_SQL = fs.readFileSync(
  path.join(__dirname, 'wipe-all-data.sql'),
  'utf8',
);

const WIPE_STATEMENTS = WIPE_SQL.split(/;\s*(?=DO \$\$)/)
  .map((statement) => statement.trim())
  .filter(Boolean)
  .map((statement) =>
    statement.endsWith(';') ? statement : `${statement};`,
  );

function stringifyRows(rows) {
  return JSON.stringify(
    rows,
    (_key, value) => (typeof value === 'bigint' ? Number(value) : value),
    2,
  );
}

async function connect() {
  const errors = [];
  for (const [name, url] of urls) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      console.log(`Connected using ${name}`);
      return prisma;
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
      await prisma.$disconnect().catch(() => undefined);
    }
  }
  throw new Error(`Could not reach Postgres.\n${errors.join('\n')}`);
}

async function main() {
  const mode = process.argv[2] || 'preview';
  console.log(`Mode: ${mode}`);
  const prisma = await connect();
  try {
    const before = await prisma.$queryRawUnsafe(COUNT_SQL);
    console.log('Row counts before:');
    console.log(stringifyRows(before));

    if (mode === 'wipe') {
      for (const statement of WIPE_STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
      }
      const after = await prisma.$queryRawUnsafe(COUNT_SQL);
      console.log('Row counts after:');
      console.log(stringifyRows(after));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
