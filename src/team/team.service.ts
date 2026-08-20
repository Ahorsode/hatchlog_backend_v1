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
import { PrismaService } from '../prisma/prisma.service';
import { AuthContextCache } from '../auth/auth-context.cache';

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
      select: { userId: true },
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

    return {
      members: membersWithContext,
      invitations,
      isAbsoluteOwner: farm?.userId === user.id,
    };
  }

  async createInvitation(user: AuthUser, dto: CreateInvitationDto) {
    assertFarmAccess(user, dto.farm_id);
    await this.assertOwnerOrManager(user, dto.farm_id);

    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException('Provide either email or phoneNumber');
    }
    if (!ALLOWED_ROLES.has(dto.role)) {
      throw new BadRequestException('Invalid role');
    }

    const orConditions: Record<string, string>[] = [];
    if (dto.email) orConditions.push({ email: dto.email.toLowerCase() });
    if (dto.phoneNumber) orConditions.push({ phoneNumber: dto.phoneNumber });

    const existing = await this.prisma.invitation.findFirst({
      where: { farmId: dto.farm_id, OR: orConditions },
    });

    if (existing?.status === 'ACCEPTED') {
      throw new BadRequestException('This user is already a farm member');
    }

    if (existing) {
      return this.prisma.invitation.update({
        where: { id: existing.id },
        data: { role: dto.role as Role },
      });
    }

    return this.prisma.invitation.create({
      data: {
        farmId: dto.farm_id,
        email: dto.email?.toLowerCase() ?? null,
        phoneNumber: dto.phoneNumber ?? null,
        role: dto.role as Role,
        status: 'PENDING',
      },
    });
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
