import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateEggCategoryDto,
  FarmScopedQueryDto,
  UpdateEggCategoryDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EggCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);

    await this.ensureDefault(query.farm_id);

    return this.prisma.eggCategory.findMany({
      where: { farmId: query.farm_id },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AuthUser, dto: CreateEggCategoryDto) {
    assertFarmAccess(user, dto.farm_id);
    return this.prisma.eggCategory.create({
      data: {
        farmId: dto.farm_id,
        name: dto.name,
        description: dto.description,
        sellingPrice: dto.sellingPrice ?? 0,
        unitSize: dto.unitSize ?? 30,
        isStockInternal: dto.isStockInternal ?? true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateEggCategoryDto) {
    const existing = await this.prisma.eggCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Egg category not found');

    const farmId = dto.farm_id ?? existing.farmId;
    assertFarmAccess(user, farmId);
    if (existing.farmId !== farmId) {
      throw new NotFoundException('Egg category not found');
    }

    return this.prisma.eggCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.sellingPrice !== undefined
          ? { sellingPrice: dto.sellingPrice }
          : {}),
        ...(dto.unitSize !== undefined ? { unitSize: dto.unitSize } : {}),
        ...(dto.isStockInternal !== undefined
          ? { isStockInternal: dto.isStockInternal }
          : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const existing = await this.prisma.eggCategory.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Egg category not found');

    await this.prisma.eggCategory.delete({ where: { id } });
    return { success: true };
  }

  private async ensureDefault(farmId: string) {
    const existing = await this.prisma.eggCategory.findFirst({
      where: { farmId, name: 'Unsorted' },
    });
    if (!existing) {
      await this.prisma.eggCategory.create({
        data: {
          farmId,
          name: 'Unsorted',
          description: 'Default category for new egg collections',
        },
      });
    }
  }
}
