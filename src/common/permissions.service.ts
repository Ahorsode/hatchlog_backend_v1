import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContextCache } from '../auth/auth-context.cache';
import { assertFarmAccess } from './farm-access';
import type {
  PermissionAction,
  PermissionModule,
} from './decorators/require-farm-permission.decorator';

const PERMISSION_MAP = {
  finance: ['canViewFinance', 'canEditFinance'],
  inventory: ['canViewInventory', 'canEditInventory'],
  batches: ['canViewBatches', 'canEditBatches'],
  sales: ['canViewSales', 'canEditSales'],
  eggs: ['canViewEggs', 'canEditEggs'],
  feeding: ['canViewFeeding', 'canEditFeeding'],
  houses: ['canViewHouses', 'canEditHouses'],
  mortality: ['canViewMortality', 'canEditMortality'],
  health: ['canViewHealth', 'canEditHealth'],
  customers: ['canViewCustomers', 'canEditCustomers'],
  team: ['canViewTeam', 'canEditTeam'],
} as const;

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCache: AuthContextCache,
  ) {}

  async resolveFarmContext(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const cached = this.authCache.getFarmContext<{
      farmId: string;
      isFarmOwner: boolean;
      role: string;
      permissions: unknown;
      membership: { role: string } | null;
    }>(user.id, farmId);
    if (cached) return cached;

    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, userId: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');

    const isFarmOwner = farm.userId === user.id;
    const membership = await this.prisma.farmMember.findUnique({
      where: { farmId_userId: { farmId, userId: user.id } },
      select: { role: true },
    });
    const permissions = await this.prisma.userPermission.findUnique({
      where: { userId_farmId: { userId: user.id, farmId } },
    });

    const role = isFarmOwner
      ? 'OWNER'
      : membership?.role || user.role || 'WORKER';

    const ctx = { farmId, isFarmOwner, role, permissions, membership };
    this.authCache.setFarmContext(user.id, farmId, ctx);
    return ctx;
  }

  async hasPermission(
    user: AuthUser,
    farmId: string,
    module: PermissionModule,
    action: PermissionAction,
  ): Promise<boolean> {
    const ctx = await this.resolveFarmContext(user, farmId);
    if (ctx.isFarmOwner) return true;
    if (ctx.role === 'MANAGER' || ctx.role === 'OWNER') return true;

    const [viewKey, editKey] = PERMISSION_MAP[module];
    const perms = ctx.permissions as Record<string, boolean> | null;
    if (action === 'view') {
      return Boolean(perms?.[viewKey] || perms?.[editKey]);
    }
    return Boolean(perms?.[editKey]);
  }

  async assertPermission(
    user: AuthUser,
    farmId: string,
    module: PermissionModule,
    action: PermissionAction,
  ): Promise<void> {
    const ok = await this.hasPermission(user, farmId, module, action);
    if (!ok) {
      throw new ForbiddenException(
        `Missing ${action} permission for ${module}`,
      );
    }
  }
}
