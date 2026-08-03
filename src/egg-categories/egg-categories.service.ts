import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CreateEggCategoryDto, FarmScopedQueryDto } from '../common/dto/domain.dto';
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
      },
    });
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
