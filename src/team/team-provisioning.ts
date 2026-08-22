import { BadRequestException } from '@nestjs/common';
import { Invitation, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  buildPhoneLookupCandidates,
  normalizePhoneNumber,
  syntheticEmailFromPhone,
} from '../common/phone';
import { getDefaultPermissionsForRole, StaffPermissionFlags } from '../common/staff-permissions';
import { WORKER_PLACEHOLDER_PASSWORD } from './team.constants';

export type ProvisionWorkerInput = {
  farmId: string;
  email: string | null;
  phone: string | null;
  role: Role;
  permissions?: Partial<StaffPermissionFlags> | null;
};

export type ProvisionWorkerResult = {
  userId: string;
  createdUser: boolean;
  mustChangePassword: boolean;
  invitation: Invitation;
  loginEmail: string | null;
  phoneNumber: string | null;
  firstname: string | null;
  surname: string | null;
};

export function invitationPhoneConflictError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.some((field) =>
      String(field).toLowerCase().includes('phone'),
    );
  }
  return String(target ?? '')
    .toLowerCase()
    .includes('phone');
}

export function throwIfInvitationPhoneConflict(error: unknown): never {
  if (invitationPhoneConflictError(error)) {
    throw new BadRequestException(
      'This phone number already has an account on another farm',
    );
  }
  throw error;
}

function buildIdentityFilters(
  email: string | null,
  phone: string | null,
  rawPhone?: string | null,
) {
  const phoneCandidates =
    phone || rawPhone
      ? buildPhoneLookupCandidates(rawPhone || phone || '')
      : [];
  const identityFilters: Array<
    { email: string } | { phoneNumber: { in: string[] } }
  > = [];
  if (email) identityFilters.push({ email });
  if (phoneCandidates.length > 0) {
    identityFilters.push({ phoneNumber: { in: phoneCandidates } });
  }
  return { identityFilters, phoneCandidates };
}

export async function provisionWorkerMembership(
  tx: Prisma.TransactionClient,
  input: ProvisionWorkerInput,
): Promise<ProvisionWorkerResult> {
  const { farmId, role } = input;
  const email = input.email?.toLowerCase().trim() || null;
  const phone = normalizePhoneNumber(input.phone);
  const { identityFilters, phoneCandidates } = buildIdentityFilters(
    email,
    phone,
    input.phone,
  );

  if (identityFilters.length === 0) {
    throw new BadRequestException('Provide either email or phoneNumber');
  }

  let worker = await tx.user.findFirst({
    where: { OR: identityFilters },
  });

  const existingMembership = worker
    ? await tx.farmMember.findUnique({
        where: {
          farmId_userId: { farmId, userId: worker.id },
        },
      })
    : null;
  if (existingMembership) {
    throw new BadRequestException('This user is already a farm member');
  }

  const createdUser = !worker;
  if (!worker) {
    const passwordHash = await bcrypt.hash(WORKER_PLACEHOLDER_PASSWORD, 10);
    const loginEmail = email || syntheticEmailFromPhone(phone as string);
    worker = await tx.user.create({
      data: {
        email: loginEmail,
        phoneNumber: phone,
        firstname: null,
        surname: null,
        password: passwordHash,
        role: Role.WORKER,
        mustChangePassword: true,
      },
    });
  }

  await tx.farmMember.upsert({
    where: {
      farmId_userId: { farmId, userId: worker.id },
    },
    create: {
      farmId,
      userId: worker.id,
      role,
    },
    update: { role },
  });

  const permissions = getDefaultPermissionsForRole(role, input.permissions);
  await tx.userPermission.upsert({
    where: {
      userId_farmId: { userId: worker.id, farmId },
    },
    create: {
      userId: worker.id,
      farmId,
      ...permissions,
    },
    update: permissions,
  });

  const inviteWhere: Array<
    { email: string } | { phoneNumber: { in: string[] } }
  > = [];
  if (email) inviteWhere.push({ email });
  if (phoneCandidates.length > 0) {
    inviteWhere.push({ phoneNumber: { in: phoneCandidates } });
  }

  const existingInvite = await tx.invitation.findFirst({
    where: { farmId, OR: inviteWhere },
  });

  let invitation: Invitation;
  if (existingInvite) {
    invitation = await tx.invitation.update({
      where: { id: existingInvite.id },
      data: {
        role,
        status: 'ACCEPTED',
        email,
        phoneNumber: phone,
      },
    });
  } else {
    try {
      invitation = await tx.invitation.create({
        data: {
          farmId,
          email,
          phoneNumber: phone,
          role,
          status: 'ACCEPTED',
        },
      });
    } catch (error) {
      throwIfInvitationPhoneConflict(error);
    }
  }

  const loginEmail =
    worker.email?.trim().toLowerCase() ||
    email ||
    (phone ? syntheticEmailFromPhone(phone) : null);

  return {
    userId: worker.id,
    createdUser,
    mustChangePassword: worker.mustChangePassword,
    invitation,
    loginEmail,
    phoneNumber: worker.phoneNumber || phone,
    firstname: worker.firstname,
    surname: worker.surname,
  };
}
