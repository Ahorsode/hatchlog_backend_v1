import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateIsolationRoomDto,
  FarmScopedQueryDto,
  IsolationMortalityDto,
  IsolationReturnDto,
  IsolationTransferDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IsolationService {
  constructor(private readonly prisma: PrismaService) {}

  async listRooms(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    return this.prisma.isolationRoom.findMany({
      where: { farmId: query.farm_id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRoom(user: AuthUser, dto: CreateIsolationRoomDto) {
    assertFarmAccess(user, dto.farm_id);
    return this.prisma.isolationRoom.create({
      data: {
        farmId: dto.farm_id,
        name: dto.name,
        capacity: dto.capacity,
        userId: user.id,
      },
    });
  }

  async transfer(user: AuthUser, dto: IsolationTransferDto) {
    assertFarmAccess(user, dto.farm_id);

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.livestock.findFirst({
        where: { id: dto.batchId, farmId: dto.farm_id, isDeleted: false },
        select: { id: true, currentCount: true, isolationCount: true },
      });
      if (!batch) throw new BadRequestException('Batch not found');

      const available = (batch.currentCount || 0) - (batch.isolationCount || 0);
      if (available < dto.count) {
        throw new BadRequestException(
          'Not enough birds in main house to isolate',
        );
      }

      await tx.livestock.update({
        where: { id: dto.batchId },
        data: { isolationCount: { increment: dto.count } },
      });

      return { success: true };
    });
  }

  async returnFromIsolation(user: AuthUser, dto: IsolationReturnDto) {
    assertFarmAccess(user, dto.farm_id);

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.livestock.findFirst({
        where: { id: dto.batchId, farmId: dto.farm_id, isDeleted: false },
        select: { id: true, currentCount: true, isolationCount: true },
      });
      if (!batch) throw new BadRequestException('Batch not found');

      if ((batch.isolationCount || 0) < dto.count) {
        throw new BadRequestException(
          'Not enough birds in isolation to return',
        );
      }

      await tx.livestock.update({
        where: { id: dto.batchId },
        data: {
          isolationCount: { decrement: dto.count },
          currentCount: { increment: dto.count },
        },
      });

      return { success: true };
    });
  }

  async logMortality(user: AuthUser, dto: IsolationMortalityDto) {
    assertFarmAccess(user, dto.farm_id);

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.livestock.findFirst({
        where: { id: dto.batchId, farmId: dto.farm_id, isDeleted: false },
        select: { id: true, isolationCount: true },
      });
      if (!batch) throw new BadRequestException('Batch not found');

      if ((batch.isolationCount || 0) < dto.count) {
        throw new BadRequestException('Not enough birds in isolation');
      }

      const record = await tx.healthMortality.create({
        data: {
          batchId: dto.batchId,
          farmId: dto.farm_id,
          count: dto.count,
          type: 'DEAD',
          reason: dto.reason,
          category: dto.category,
          subCategory: dto.subCategory,
          logDate: new Date(),
          userId: user.id,
        },
      });

      await tx.livestock.update({
        where: { id: dto.batchId },
        data: { isolationCount: { decrement: dto.count } },
      });

      return record;
    });
  }
}
