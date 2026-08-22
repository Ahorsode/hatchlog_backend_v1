import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { normalizePhoneNumber } from '../src/common/phone';
import { WORKER_PLACEHOLDER_PASSWORD } from '../src/team/team.constants';
import {
  invitationPhoneConflictError,
  provisionWorkerMembership,
} from '../src/team/team-provisioning';

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function ensureSupabaseLogin(input: {
  email: string;
  password: string;
  phoneNumber: string | null;
  prismaUserId: string;
  firstname: string | null;
  surname: string | null;
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for password bridge',
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const metadata = {
    prisma_user_id: input.prismaUserId,
    firstname: input.firstname,
    surname: input.surname,
  };

  const listRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(input.email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  );

  let authUserId: string | null = null;
  if (listRes.ok) {
    const payload = (await listRes.json()) as {
      users?: Array<{ id: string; email?: string }>;
      id?: string;
    };
    authUserId =
      payload.id ||
      payload.users?.find(
        (user) => user.email?.toLowerCase() === input.email.toLowerCase(),
      )?.id ||
      payload.users?.[0]?.id ||
      null;
  }

  if (!authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      phone: input.phoneNumber || undefined,
      phone_confirm: Boolean(input.phoneNumber),
      user_metadata: metadata,
    });
    if (error && !error.message.toLowerCase().includes('already')) {
      throw new Error(error.message);
    }
    authUserId = data.user?.id ?? null;
  }

  if (!authUserId) {
    throw new Error('Failed to resolve Supabase auth user');
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    authUserId,
    {
      password: input.password,
      email: input.email,
      user_metadata: metadata,
    },
  );
  if (updateError) {
    throw new Error(updateError.message);
  }
}

function skipReason(error: unknown): string {
  if (invitationPhoneConflictError(error)) {
    return 'phone number already linked to another farm invitation';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function main() {
  loadEnvFile();
  const prisma = new PrismaClient();
  const pending = await prisma.invitation.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  let provisioned = 0;
  let skipped = 0;
  const skippedByReason = new Map<string, number>();

  console.log(`Found ${pending.length} pending invitation(s).`);

  for (const invite of pending) {
    const label =
      invite.phoneNumber || invite.email || invite.id;
    try {
      const provisionedRow = await prisma.$transaction((tx) =>
        provisionWorkerMembership(tx, {
          farmId: invite.farmId,
          email: invite.email,
          phone: normalizePhoneNumber(invite.phoneNumber),
          role: invite.role,
        }),
      );

      if (
        provisionedRow.createdUser ||
        (provisionedRow.mustChangePassword && provisionedRow.loginEmail)
      ) {
        await ensureSupabaseLogin({
          email: provisionedRow.loginEmail as string,
          password: WORKER_PLACEHOLDER_PASSWORD,
          phoneNumber: provisionedRow.phoneNumber,
          prismaUserId: provisionedRow.userId,
          firstname: provisionedRow.firstname,
          surname: provisionedRow.surname,
        });
      }

      provisioned += 1;
      console.log(`Provisioned ${label} -> user ${provisionedRow.userId}`);
    } catch (error) {
      skipped += 1;
      const reason = skipReason(error);
      skippedByReason.set(reason, (skippedByReason.get(reason) ?? 0) + 1);
      console.warn(`Skipped ${invite.id} (${label}): ${reason}`);
    }
  }

  console.log('\nBackfill summary');
  console.log(`  Provisioned: ${provisioned}`);
  console.log(`  Skipped: ${skipped}`);
  if (skippedByReason.size > 0) {
    console.log('  Skip reasons:');
    for (const [reason, count] of skippedByReason.entries()) {
      console.log(`    - ${count}x ${reason}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
