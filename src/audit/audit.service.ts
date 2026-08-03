import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsertLogs(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    return this.prisma.insertLog.findMany({
      where: { farmId },
      include: {
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { insertedAt: 'desc' },
      take: 100,
    });
  }

  async getDeleteLogs(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    return this.prisma.deleteLog.findMany({
      where: { farmId },
      include: {
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    });
  }

  async getEditLogs(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    return this.prisma.auditLog.findMany({
      where: { farmId },
      include: {
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
