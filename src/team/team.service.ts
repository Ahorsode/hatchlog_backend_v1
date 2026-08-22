import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateInvitationDto,
  FarmScopedQueryDto,
  UpdateMemberRoleDto,
  UpdatePermissionsDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess } from '../common/farm-access';
import { normalizePhoneNumber } from '../common/phone';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContextCache } from '../auth/auth-context.cache';
import { MeService } from '../me/me.service';
import {
  normalizeTier,
  resolveFarmAccess,
  WORKER_LIMITS,
} from '../subscriptions/farm-access-status';
import { WORKER_PLACEHOLDER_PASSWORD } from './team.constants';
import {
  invitationPhoneConflictError,
  provisionWorkerMembership,
} from './team-provisioning';

const ALLOWED_ROLES = new Set<string>([
  'MANAGER',
  'WORKER',
  'ACCOUNTANT',
  'FINANCE_OFFICER',
  'CASHIER',
]);

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCache: AuthContextCache,
    private readonly meService: MeService,
  ) {}

  private async assertOwnerOrManager(user: AuthUser, farmId: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { userId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    if (farm.userId === user.id) return;

    const membership = await this.prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: user.id } },
      select: { role: true },
    });
    if (membership?.role === 'MANAGER') return;

    throw new ForbiddenException(
      'Only Owners or Managers can perform this action',
    );
  }

  private async assertFarmOwner(user: AuthUser, farmId: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { userId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    if (farm.userId !== user.id) {
      throw new ForbiddenException(
        'Only the farm owner can perform this action',
      );
    }
  }

  async listMembers(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);

    const farm = await this.prisma.farm.findUnique({
      where: { id: query.farm_id },
      select: {
        userId: true,
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
      },
    });

    const members = await this.prisma.farmMember.findMany({
      where: { farmId: query.farm_id },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            surname: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
    });

    const permissions = await this.prisma.userPermission.findMany({
      where: { farmId: query.farm_id },
    });

    const membersWithContext = members.map((m) => ({
      ...m,
      user: {
        ...m.user,
        role: m.role,
        userPermissions: permissions.filter((p) => p.userId === m.userId),
      },
    }));

    const invitations = await this.prisma.invitation.findMany({
      where: { farmId: query.farm_id, status: 'PENDING' },
    });

    const accessSnapshot = farm ? resolveFarmAccess(farm) : null;
    const tier = accessSnapshot?.tier ?? normalizeTier(farm?.subscriptionTier);
    const limit = WORKER_LIMITS[tier];
    const nonOwnerMembers = members.filter((member) => member.role !== 'OWNER')
      .length;
    const currentSeats = nonOwnerMembers;

    let currentUserRole = 'WORKER';
    if (farm?.userId === user.id) {
      currentUserRole = 'OWNER';
    } else {
      const selfMembership = members.find(
        (member) => member.userId === user.id,
      );
      if (selfMembership?.role) {
        currentUserRole = selfMembership.role;
      }
    }

    return {
      members: membersWithContext,
      invitations,
      isAbsoluteOwner: farm?.userId === user.id,
      currentUserRole,
      limitCheck: {
        canAdd: currentSeats < limit,
        limit,
        current: currentSeats,
      },
    };
  }

  private async assertWorkerSeatAvailable(farmId: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    const accessSnapshot = resolveFarmAccess(farm);
    const limit = WORKER_LIMITS[accessSnapshot.tier];
    const nonOwnerMembers = await this.prisma.farmMember.count({
      where: { farmId, NOT: { role: 'OWNER' } },
    });
    if (nonOwnerMembers >= limit) {
      throw new BadRequestException(
        `Worker limit reached (${nonOwnerMembers}/${limit}). Upgrade your plan to invite more staff.`,
      );
    }
  }

  async createInvitation(user: AuthUser, dto: CreateInvitationDto) {
    assertFarmAccess(user, dto.farm_id);
    await this.assertOwnerOrManager(user, dto.farm_id);
    await this.assertWorkerSeatAvailable(dto.farm_id);

    const email = dto.email?.toLowerCase().trim() || null;
    const phone = normalizePhoneNumber(dto.phoneNumber);
    if (!email && !phone) {
      throw new BadRequestException('Provide either email or phoneNumber');
    }
    if (!ALLOWED_ROLES.has(dto.role)) {
      throw new BadRequestException('Invalid role');
    }

    const role = dto.role as Role;

    let provisioned;
    try {
      provisioned = await this.prisma.$transaction((tx) =>
        provisionWorkerMembership(tx, {
          farmId: dto.farm_id,
          email,
          phone,
          role,
          permissions: dto.permissions,
        }),
      );
    } catch (error) {
      if (invitationPhoneConflictError(error)) {
        throw new BadRequestException(
          'This phone number already has an account on another farm',
        );
      }
      throw error;
    }

    if (provisioned.createdUser) {
      await this.meService.ensureSupabaseLogin({
        email: provisioned.loginEmail as string,
        password: WORKER_PLACEHOLDER_PASSWORD,
        phoneNumber: provisioned.phoneNumber,
        prismaUserId: provisioned.userId,
        firstname: provisioned.firstname,
        surname: provisioned.surname,
      });
    } else if (provisioned.mustChangePassword && provisioned.loginEmail) {
      await this.meService.ensureSupabaseLogin({
        email: provisioned.loginEmail,
        password: WORKER_PLACEHOLDER_PASSWORD,
        phoneNumber: provisioned.phoneNumber,
        prismaUserId: provisioned.userId,
        firstname: provisioned.firstname,
        surname: provisioned.surname,
      });
    }

    this.authCache.invalidateUser(provisioned.userId);

    return {
      ...provisioned.invitation,
      userId: provisioned.userId,
      createdUser: provisioned.createdUser,
      mustChangePassword: provisioned.mustChangePassword,
    };
  }

  async deleteInvitation(user: AuthUser, invitationId: string, farmId: string) {
    assertFarmAccess(user, farmId);
    await this.assertOwnerOrManager(user, farmId);

    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, farmId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.prisma.invitation.delete({ where: { id: invitationId } });
    return { success: true };
  }

  async deleteMember(user: AuthUser, targetUserId: string, farmId: string) {
    assertFarmAccess(user, farmId);
    await this.assertFarmOwner(user, farmId);

    if (targetUserId === user.id) {
      throw new BadRequestException('Cannot remove yourself');
    }

    const membership = await this.prisma.farmMember.findFirst({
      where: { farmId, userId: targetUserId },
    });
    if (!membership) throw new NotFoundException('Member not found');

    await this.prisma.farmMember.delete({ where: { id: membership.id } });
    this.authCache.invalidateUser(targetUserId);
    return { success: true };
  }

  async updateMemberRole(
    user: AuthUser,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    await this.assertFarmOwner(user, dto.farm_id);

    if (!ALLOWED_ROLES.has(dto.role)) {
      throw new BadRequestException('Invalid role');
    }
    if (targetUserId === user.id) {
      throw new BadRequestException('Cannot change your own role');
    }

    const membership = await this.prisma.farmMember.findUnique({
      where: {
        farmId_userId: { farmId: dto.farm_id, userId: targetUserId },
      },
    });
    if (!membership) throw new NotFoundException('Member not found');

    const updated = await this.prisma.farmMember.update({
      where: {
        farmId_userId: { farmId: dto.farm_id, userId: targetUserId },
      },
      data: { role: dto.role as Role },
    });
    this.authCache.invalidateUser(targetUserId);
    return updated;
  }

  async getPermissions(user: AuthUser, targetUserId: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const perms = await this.prisma.userPermission.findUnique({
      where: { userId_farmId: { userId: targetUserId, farmId } },
    });
    return perms ?? {};
  }

  async updatePermissions(
    user: AuthUser,
    targetUserId: string,
    farmId: string,
    dto: UpdatePermissionsDto,
  ) {
    assertFarmAccess(user, farmId);
    await this.assertFarmOwner(user, farmId);

    if (targetUserId === user.id) {
      throw new BadRequestException('Cannot modify your own permissions');
    }

    const perms = await this.prisma.userPermission.upsert({
      where: { userId_farmId: { userId: targetUserId, farmId } },
      create: {
        userId: targetUserId,
        farmId,
        ...dto,
      },
      update: { ...dto },
    });
    this.authCache.invalidateUser(targetUserId);
    return perms;
  }
}
