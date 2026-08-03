import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateEggDto,
  ListQueryDto,
  UpdateEggDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EggsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    return this.prisma.eggProduction.findMany({
      where: {
        farmId: query.farm_id,
        isDeleted: false,
        ...(query.batch_id ? { batchId: query.batch_id } : {}),
      },
      orderBy: { logDate: 'desc' },
      take,
      include: {
        category: true,
        batch: { select: { id: true, batchName: true, breedType: true } },
      },
    });
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const log = await this.prisma.eggProduction.findFirst({
      where: { id, farmId, isDeleted: false },
      include: { category: true, batch: true },
    });
    if (!log) throw new NotFoundException('Egg production log not found');
    return log;
  }

  async create(user: AuthUser, dto: CreateEggDto) {
    assertFarmAccess(user, dto.farm_id);

    const batch = await this.prisma.livestock.findFirst({
      where: { id: dto.batchId, farmId: dto.farm_id, isDeleted: false },
      select: { id: true },
    });
    if (!batch) throw new BadRequestException('Batch not found on this farm');

    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.farmSettings.findUnique({
        where: { farmId: dto.farm_id },
        select: { eggsPerCrate: true },
      });
      const eggsPerCrate = settings?.eggsPerCrate ?? 30;
      const calculatedEggs =
        dto.eggsCollected ??
        (dto.cratesCollected != null
          ? Math.round(Number(dto.cratesCollected) * eggsPerCrate)
          : 0);

      let finalCategoryId = dto.categoryId;
      if (!finalCategoryId) {
        let unsorted = await tx.eggCategory.findFirst({
          where: { farmId: dto.farm_id, name: 'Unsorted' },
        });
        if (!unsorted) {
          unsorted = await tx.eggCategory.create({
            data: {
              farmId: dto.farm_id,
              name: 'Unsorted',
              description: 'Default category for daily collections',
            },
          });
        }
        finalCategoryId = unsorted.id;
      }

      const unusableCount = dto.unusableCount || 0;
      const eggsRemaining = calculatedEggs - unusableCount;

      const log = await tx.eggProduction.create({
        data: {
          batchId: dto.batchId,
          farmId: dto.farm_id,
          eggsCollected: calculatedEggs,
          cratesCollected: dto.cratesCollected ?? null,
          categoryId: finalCategoryId,
          unusableCount,
          eggsRemaining,
          qualityGrade: dto.qualityGrade,
          isSorted: dto.isSorted || false,
          smallCount: dto.smallCount || 0,
          mediumCount: dto.mediumCount || 0,
          largeCount: dto.largeCount || 0,
          logDate: requireDate(dto.logDate, 'logDate'),
          userId: user.id,
        },
        include: { category: true },
      });

      const usableEggs = eggsRemaining;
      if (usableEggs > 0) {
        const category = await tx.eggCategory.findUnique({
          where: { id: finalCategoryId },
        });
        const itemName = category
          ? `Eggs (${category.name})`
          : 'Eggs (Unsorted)';
        const existing = await tx.inventory.findFirst({
          where: {
            farmId: dto.farm_id,
            category: 'EGGS',
            eggCategoryId: finalCategoryId,
          },
        });
        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { stockLevel: { increment: usableEggs } },
          });
        } else {
          await tx.inventory.create({
            data: {
              farmId: dto.farm_id,
              userId: user.id,
              itemName,
              stockLevel: usableEggs,
              unit: 'eggs',
              category: 'EGGS',
              eggCategoryId: finalCategoryId,
            },
          });
        }
      }

      return log;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateEggDto) {
    const existing = await this.prisma.eggProduction.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Egg production log not found');
    }
    assertFarmAccess(user, existing.farmId);

    const eggsCollected = dto.eggsCollected ?? existing.eggsCollected;
    const unusableCount = dto.unusableCount ?? existing.unusableCount;

    return this.prisma.eggProduction.update({
      where: { id },
      data: {
        ...(dto.eggsCollected !== undefined
          ? { eggsCollected: dto.eggsCollected }
          : {}),
        ...(dto.unusableCount !== undefined
          ? { unusableCount: dto.unusableCount }
          : {}),
        ...(dto.qualityGrade !== undefined
          ? { qualityGrade: dto.qualityGrade }
          : {}),
        ...(dto.isSorted !== undefined ? { isSorted: dto.isSorted } : {}),
        ...(dto.smallCount !== undefined ? { smallCount: dto.smallCount } : {}),
        ...(dto.mediumCount !== undefined
          ? { mediumCount: dto.mediumCount }
          : {}),
        ...(dto.largeCount !== undefined ? { largeCount: dto.largeCount } : {}),
        ...(dto.logDate !== undefined
          ? { logDate: requireDate(dto.logDate, 'logDate') }
          : {}),
        eggsRemaining: eggsCollected - unusableCount,
      },
      include: { category: true },
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.eggProduction.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Egg production log not found');
    }
    assertFarmAccess(user, existing.farmId);

    await this.prisma.eggProduction.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }
}
