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
import { passwordPolicyError } from '../common/password-policy';
import {
  buildPhoneLookupCandidates,
  normalizePhoneNumber,
  syntheticEmailFromPhone,
} from '../common/phone';
import type { UpdateMePasswordDto, UpdateMeProfileDto } from './dto/update-me.dto';

function isPlaceholderFarm(farm: {
  capacity: number;
  location: string | null;
}) {
  return farm.capacity === 0 && !(farm.location ?? '').trim();
}

function pickActiveFarmId(
  owned: Array<{ id: string; capacity: number; location: string | null }>,
  memberFarms: Array<{ id: string; capacity: number; location: string | null }>,
): string | null {
  const seen = new Set<string>();
  const all: Array<{
    id: string;
    capacity: number;
    location: string | null;
  }> = [];
  for (const farm of [...owned, ...memberFarms]) {
    if (seen.has(farm.id)) continue;
    seen.add(farm.id);
    all.push(farm);
  }
  return all.find((farm) => !isPlaceholderFarm(farm))?.id ?? all[0]?.id ?? null;
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
        farms: { select: { id: true, capacity: true, location: true } },
        memberships: {
          select: {
            farmId: true,
            role: true,
            farm: { select: { id: true, capacity: true, location: true } },
          },
        },
        userPermissions: true,
      },
    });

    const activeFarmId = pickActiveFarmId(
      dbUser?.farms ?? [],
      (dbUser?.memberships ?? [])
        .map((membership) => membership.farm)
        .filter((farm): farm is NonNullable<typeof farm> => Boolean(farm)),
    );

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
    const filters: Array<{ email: string } | { phoneNumber: { in: string[] } }> =
      [];
    if (email) filters.push({ email: email.toLowerCase().trim() });
    if (phone) {
      const candidates = buildPhoneLookupCandidates(phone);
      if (candidates.length > 0) {
        filters.push({ phoneNumber: { in: candidates } });
      }
    }
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
        : { phoneNumber: { in: buildPhoneLookupCandidates(trimmed) } },
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

    await this.ensureSupabaseLogin({
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

  async ensureSupabaseLogin(input: {
    email: string;
    password: string;
    phoneNumber: string | null;
    prismaUserId: string;
    firstname: string | null;
    surname: string | null;
  }) {
    return this.syncSupabaseAuthUser(input);
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
    const phone = normalizePhoneNumber(data.phoneNumber) ?? data.phoneNumber?.trim() ?? null;

    const identityFilters: Array<
      { email: string } | { phoneNumber: { in: string[] } }
    > = [];
    if (email) identityFilters.push({ email });
    if (data.phoneNumber || phone) {
      const candidates = buildPhoneLookupCandidates(
        data.phoneNumber || phone || '',
      );
      if (candidates.length > 0) {
        identityFilters.push({ phoneNumber: { in: candidates } });
      }
    }
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

  async updateProfile(user: AuthUser, dto: UpdateMeProfileDto) {
    const firstname = dto.firstname.trim();
    const surname = dto.surname.trim();
    if (!firstname || !surname) {
      throw new BadRequestException('firstname and surname are required');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { firstname, surname },
      select: {
        id: true,
        firstname: true,
        surname: true,
        email: true,
        phoneNumber: true,
      },
    });
    this.authCache.invalidateUser(user.id);
    return updated;
  }

  async updatePassword(user: AuthUser, dto: UpdateMePasswordDto) {
    const nextPassword = (dto.newPassword || dto.new || '').trim();
    const policyError = passwordPolicyError(nextPassword);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    if (!dbUser.mustChangePassword) {
      if (!dto.current) {
        throw new BadRequestException('Current password is required');
      }
      const valid = await bcrypt.compare(dto.current, dbUser.password || '');
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10);
    const email =
      dbUser.email?.trim().toLowerCase() ||
      (dbUser.phoneNumber ? syntheticEmailFromPhone(dbUser.phoneNumber) : null);
    if (!email) {
      throw new BadRequestException('User has no email or phone for auth');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        mustChangePassword: false,
        email: dbUser.email || email,
      },
    });

    await this.ensureSupabaseLogin({
      email,
      password: nextPassword,
      phoneNumber: dbUser.phoneNumber,
      prismaUserId: dbUser.id,
      firstname: dbUser.firstname,
      surname: dbUser.surname,
    });

    this.authCache.invalidateUser(user.id);
    return { success: true, mustChangePassword: false };
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

    return farms
      .map((farm) => ({
        ...farm,
        membershipRole:
          farm.userId === user.id ? 'OWNER' : (roleByFarm.get(farm.id) ?? null),
      }))
      .sort((a, b) => {
        const placeholderDelta =
          Number(isPlaceholderFarm(a)) - Number(isPlaceholderFarm(b));
        if (placeholderDelta !== 0) return placeholderDelta;
        return a.name.localeCompare(b.name);
      });
  }
}
