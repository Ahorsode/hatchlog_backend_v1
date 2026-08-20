import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../auth/auth.types';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { trialCreateData } from '../subscriptions/farm-access-status';
import { AuthContextCache } from '../auth/auth-context.cache';

function syntheticEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `phone.${digits}@users.hatchlog.local`;
}

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly authCache: AuthContextCache,
  ) {}

  async getMe(user: AuthUser) {
    const cached = this.authCache.getMeProfile<Record<string, unknown>>(
      user.id,
    );
    if (cached) return cached;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstname: true,
        surname: true,
        role: true,
        mustChangePassword: true,
        sessionVersion: true,
        securityNotice: true,
        securityRevokedAt: true,
        farms: { select: { id: true } },
        memberships: { select: { farmId: true, role: true } },
        userPermissions: true,
      },
    });

    const activeFarmId =
      dbUser?.farms[0]?.id ?? dbUser?.memberships[0]?.farmId ?? null;

    const membership = activeFarmId
      ? dbUser?.memberships.find((m) => m.farmId === activeFarmId)
      : null;

    const permissions = activeFarmId
      ? (dbUser?.userPermissions.find((p) => p.farmId === activeFarmId) ?? null)
      : null;

    const isFarmOwner =
      !!activeFarmId &&
      (dbUser?.farms.some((f) => f.id === activeFarmId) ?? false);

    const role =
      membership?.role ??
      (isFarmOwner
        ? 'OWNER'
        : dbUser?.role === 'OWNER'
          ? 'WORKER'
          : (dbUser?.role ?? user.role ?? 'WORKER'));

    const profile = {
      id: user.id,
      email: user.email ?? dbUser?.email ?? null,
      phoneNumber: user.phoneNumber ?? dbUser?.phoneNumber ?? null,
      firstname: dbUser?.firstname ?? null,
      surname: dbUser?.surname ?? null,
      role,
      activeFarmId,
      isFarmOwner,
      permissions,
      mustChangePassword: dbUser?.mustChangePassword ?? false,
      sessionVersion: dbUser?.sessionVersion ?? 1,
      securityNotice: dbUser?.securityNotice ?? null,
      securityInvalidated: Boolean(dbUser?.securityRevokedAt),
      farmIds: user.farmIds,
      supabaseSub: user.supabaseSub,
    };
    this.authCache.setMeProfile(user.id, profile);
    return profile;
  }

  async getProfileByIdentity(email?: string, phone?: string) {
    const filters: Array<{ email: string } | { phoneNumber: string }> = [];
    if (email) filters.push({ email: email.toLowerCase().trim() });
    if (phone) filters.push({ phoneNumber: phone.trim() });
    if (filters.length === 0) return null;

    return this.prisma.user.findFirst({
      where: { OR: filters },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstname: true,
        surname: true,
        role: true,
        sessionVersion: true,
        mustChangePassword: true,
      },
    });
  }

  async passwordBridge(identifier: string, password: string) {
    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      throw new BadRequestException('identifier and password are required');
    }

    const isEmail = trimmed.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail
        ? { email: trimmed.toLowerCase() }
        : {
            OR: [
              { phoneNumber: trimmed },
              { phoneNumber: trimmed.replace(/\s+/g, '') },
            ],
          },
    });

    if (!user?.password) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }

    const email =
      user.email?.trim().toLowerCase() ||
      (user.phoneNumber ? syntheticEmailFromPhone(user.phoneNumber) : null);

    if (!email) {
      throw new BadRequestException('User has no email or phone for auth');
    }

    if (!user.email) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    await this.syncSupabaseAuthUser({
      email,
      password,
      phoneNumber: user.phoneNumber,
      prismaUserId: user.id,
      firstname: user.firstname,
      surname: user.surname,
    });

    return {
      email,
      mustChangePassword: user.mustChangePassword,
      userId: user.id,
      firstname: user.firstname,
      surname: user.surname,
      phoneNumber: user.phoneNumber,
    };
  }

  private async syncSupabaseAuthUser(input: {
    email: string;
    password: string;
    phoneNumber: string | null;
    prismaUserId: string;
    firstname: string | null;
    surname: string | null;
  }) {
    const supabaseUrl = this.config.get('SUPABASE_URL', { infer: true });
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY', {
      infer: true,
    });
    if (!serviceKey) {
      throw new BadRequestException(
        'SUPABASE_SERVICE_ROLE_KEY is required for password bridge',
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
          (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
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
        throw new BadRequestException(error.message);
      }
      authUserId = data.user?.id ?? null;
    }

    if (!authUserId) {
      throw new BadRequestException('Failed to resolve Supabase auth user');
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
      throw new BadRequestException(updateError.message);
    }
  }

  async bootstrapProfile(data: {
    email?: string;
    phoneNumber?: string;
    firstname?: string;
    surname?: string;
    passwordHash?: string;
  }) {
    const email = data.email?.toLowerCase().trim() ?? null;
    const phone = data.phoneNumber?.trim() ?? null;

    const identityFilters: Array<{ email: string } | { phoneNumber: string }> =
      [];
    if (email) identityFilters.push({ email });
    if (phone) identityFilters.push({ phoneNumber: phone });
    if (identityFilters.length === 0) {
      throw new BadRequestException('email or phoneNumber is required');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: identityFilters },
      include: {
        memberships: { select: { farmId: true } },
        farms: { select: { id: true } },
      },
    });

    if (existing) {
      const farmId =
        existing.farms[0]?.id ?? existing.memberships[0]?.farmId ?? null;
      return { userId: existing.id, farmId, created: false };
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        phoneNumber: phone,
        firstname: data.firstname ?? null,
        surname: data.surname ?? null,
        password: data.passwordHash ?? null,
        role: 'OWNER',
      },
    });

    const farm = await this.prisma.farm.create({
      data: {
        name: `${data.firstname ?? 'My'}'s Farm`,
        location: '',
        capacity: 0,
        userId: newUser.id,
        ...trialCreateData(),
      },
    });

    await this.prisma.farmMember.create({
      data: {
        farmId: farm.id,
        userId: newUser.id,
        role: 'OWNER',
      },
    });

    await this.prisma.farmSettings.create({
      data: { farmId: farm.id, currency: 'GHS', eggsPerCrate: 30 },
    });

    return { userId: newUser.id, farmId: farm.id, created: true };
  }

  async listFarms(user: AuthUser) {
    if (user.farmIds.length === 0) return [];

    const farms = await this.prisma.farm.findMany({
      where: { id: { in: user.farmIds } },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
        userId: true,
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const memberships = await this.prisma.farmMember.findMany({
      where: {
        userId: user.id,
        farmId: { in: user.farmIds },
      },
      select: { farmId: true, role: true },
    });
    const roleByFarm = new Map(
      memberships.map((m) => [m.farmId, m.role] as const),
    );

    return farms.map((farm) => ({
      ...farm,
      membershipRole:
        farm.userId === user.id ? 'OWNER' : (roleByFarm.get(farm.id) ?? null),
    }));
  }
}
