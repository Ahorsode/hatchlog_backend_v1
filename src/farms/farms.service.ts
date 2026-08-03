import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  UpdateFarmDto,
  UpdateFarmSettingsDto,
  UpdateSalesSettingsDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      include: { settings: true, salesSettings: true },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async update(user: AuthUser, farmId: string, dto: UpdateFarmDto) {
    assertFarmAccess(user, farmId);
    const farm = await this.prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm) throw new NotFoundException('Farm not found');

    return this.prisma.farm.update({
      where: { id: farmId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });
  }

  async getSettings(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);
    return this.prisma.farmSettings.upsert({
      where: { farmId },
      update: {},
      create: { farmId },
    });
  }

  async updateSettings(
    user: AuthUser,
    farmId: string,
    dto: UpdateFarmSettingsDto,
  ) {
    assertFarmAccess(user, farmId);
    return this.prisma.farmSettings.upsert({
      where: { farmId },
      update: {
        ...(dto.eggRecordReminderTime !== undefined
          ? { eggRecordReminderTime: dto.eggRecordReminderTime }
          : {}),
        ...(dto.feedRecordReminderTime !== undefined
          ? { feedRecordReminderTime: dto.feedRecordReminderTime }
          : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.growthTargetStandard !== undefined
          ? { growthTargetStandard: dto.growthTargetStandard }
          : {}),
        ...(dto.eggsPerCrate !== undefined
          ? { eggsPerCrate: dto.eggsPerCrate }
          : {}),
        ...(dto.defaultEggUnit !== undefined
          ? { defaultEggUnit: dto.defaultEggUnit }
          : {}),
        ...(dto.allowEggUnitChange !== undefined
          ? { allowEggUnitChange: dto.allowEggUnitChange }
          : {}),
        ...(dto.defaultEggSortMode !== undefined
          ? { defaultEggSortMode: dto.defaultEggSortMode }
          : {}),
        ...(dto.allowEggSortModeChange !== undefined
          ? { allowEggSortModeChange: dto.allowEggSortModeChange }
          : {}),
      },
      create: { farmId, ...dto },
    });
  }

  async getSalesSettings(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);
    return this.prisma.salesSettings.upsert({
      where: { farmId },
      update: {},
      create: { farmId },
    });
  }

  async updateSalesSettings(
    user: AuthUser,
    farmId: string,
    dto: UpdateSalesSettingsDto,
  ) {
    assertFarmAccess(user, farmId);
    return this.prisma.salesSettings.upsert({
      where: { farmId },
      update: {
        ...(dto.allowBatchOverride !== undefined
          ? { allowBatchOverride: dto.allowBatchOverride }
          : {}),
        ...(dto.allowWorkerDiscounts !== undefined
          ? { allowWorkerDiscounts: dto.allowWorkerDiscounts }
          : {}),
        ...(dto.defaultDiscountType !== undefined
          ? { defaultDiscountType: dto.defaultDiscountType }
          : {}),
      },
      create: { farmId, ...dto },
    });
  }
}
