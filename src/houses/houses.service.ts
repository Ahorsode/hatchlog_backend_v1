import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import {
  CreateHouseDto,
  ListQueryDto,
  UpdateHouseDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HousesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertHouseManager(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);
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
    if (membership?.role !== 'MANAGER') {
      throw new ForbiddenException('Only farm owner or manager can manage houses');
    }
  }

  async list(user: AuthUser, query: ListQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    return this.prisma.house.findMany({
      where: { farmId: query.farm_id },
      orderBy: { name: 'asc' },
      take,
    });
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const house = await this.prisma.house.findFirst({
      where: { id, farmId },
    });
    if (!house) throw new NotFoundException('House not found');
    return house;
  }

  async create(user: AuthUser, dto: CreateHouseDto) {
    await this.assertHouseManager(user, dto.farm_id);
    if (!dto.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    return this.prisma.house.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        name: dto.name.trim(),
        capacity: dto.capacity,
        isIsolation: dto.isIsolation ?? false,
        farmId: dto.farm_id,
        userId: user.id,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateHouseDto) {
    const existing = await this.prisma.house.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('House not found');
    await this.assertHouseManager(user, existing.farmId);

    return this.prisma.house.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.isIsolation !== undefined
          ? { isIsolation: dto.isIsolation }
          : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.house.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('House not found');
    await this.assertHouseManager(user, existing.farmId);

    await this.prisma.house.delete({ where: { id } });
    return { success: true };
  }
}
