import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HealthEventType } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateMortalityDto,
  ListQueryDto,
  UpdateMortalityDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MortalityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    return this.prisma.healthMortality.findMany({
      where: {
        farmId: query.farm_id,
        isDeleted: false,
        ...(query.batch_id ? { batchId: query.batch_id } : {}),
        ...(query.type
          ? {
              type:
                query.type.toUpperCase() === 'SICK'
                  ? HealthEventType.SICK
                  : HealthEventType.DEAD,
            }
          : {}),
      },
      orderBy: { logDate: 'desc' },
      take,
      include: {
        batch: { select: { id: true, batchName: true } },
        isolationRoom: { select: { id: true, name: true } },
      },
    });
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const record = await this.prisma.healthMortality.findFirst({
      where: { id, farmId, isDeleted: false },
      include: { batch: true, isolationRoom: true },
    });
    if (!record) throw new NotFoundException('Mortality record not found');
    return record;
  }

  async create(user: AuthUser, dto: CreateMortalityDto) {
    assertFarmAccess(user, dto.farm_id);

    if (dto.type !== 'SICK' && dto.type !== 'DEAD') {
      throw new BadRequestException('type must be SICK or DEAD');
    }

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.livestock.findFirst({
        where: {
          id: dto.batchId,
          farmId: dto.farm_id,
          isDeleted: false,
        },
        select: { id: true, currentCount: true },
      });
      if (!batch) {
        throw new BadRequestException('Batch not found on this farm');
      }
      if ((batch.currentCount || 0) < dto.count) {
        throw new BadRequestException(
          'Count exceeds current livestock in batch',
        );
      }

      const record = await tx.healthMortality.create({
        data: {
          batchId: dto.batchId,
          farmId: dto.farm_id,
          count: dto.count,
          type:
            dto.type === 'SICK' ? HealthEventType.SICK : HealthEventType.DEAD,
          isolationRoomId:
            dto.type === 'SICK' ? dto.isolationRoomId || null : null,
          reason: dto.reason,
          category: dto.category,
          subCategory: dto.subCategory,
          logDate: dto.logDate
            ? requireDate(dto.logDate, 'logDate')
            : new Date(),
          userId: user.id,
        },
      });

      if (dto.type === 'DEAD') {
        await tx.livestock.update({
          where: { id: dto.batchId },
          data: { currentCount: { decrement: dto.count } },
        });
      } else {
        await tx.livestock.update({
          where: { id: dto.batchId },
          data: {
            currentCount: { decrement: dto.count },
            isolationCount: { increment: dto.count },
          },
        });
      }

      return record;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateMortalityDto) {
    const existing = await this.prisma.healthMortality.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Mortality record not found');
    }
    assertFarmAccess(user, existing.farmId);

    return this.prisma.healthMortality.update({
      where: { id },
      data: {
        ...(dto.count !== undefined ? { count: dto.count } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.subCategory !== undefined
          ? { subCategory: dto.subCategory }
          : {}),
        ...(dto.logDate !== undefined
          ? { logDate: requireDate(dto.logDate, 'logDate') }
          : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.healthMortality.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Mortality record not found');
    }
    assertFarmAccess(user, existing.farmId);

    await this.prisma.healthMortality.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }
}
