import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import {
  OnboardFarmDto,
  UpdateFarmDto,
  UpdateFarmSettingsDto,
  UpdateSalesSettingsDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';
import { trialCreateData } from '../subscriptions/farm-access-status';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Completes owner onboarding: fills in the placeholder farm created at
   * signup/OAuth bootstrap, or creates a farm if the user somehow has none.
   */
  async onboard(user: AuthUser, dto: OnboardFarmDto) {
    const name = dto.name?.trim();
    const location = dto.location?.trim();
    const capacity = Number(dto.capacity);

    if (!name) throw new BadRequestException('Farm name is required');
    if (!location) throw new BadRequestException('Location is required');
    if (
      !Number.isFinite(capacity) ||
      capacity < 0 ||
      !Number.isInteger(capacity)
    ) {
      throw new BadRequestException('Capacity must be a non-negative integer');
    }

    const owned = await this.prisma.farm.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (owned) {
      const farm = await this.prisma.farm.update({
        where: { id: owned.id },
        data: {
          name,
          location,
          capacity,
          ...(owned.trialStartedAt ? {} : trialCreateData()),
        },
      });

      await this.prisma.farmMember.upsert({
        where: {
          farmId_userId: { farmId: farm.id, userId: user.id },
        },
        update: { role: 'OWNER' },
        create: { farmId: farm.id, userId: user.id, role: 'OWNER' },
      });

      await this.prisma.farmSettings.upsert({
        where: { farmId: farm.id },
        update: {},
        create: { farmId: farm.id, currency: 'GHS', eggsPerCrate: 30 },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 'OWNER' },
      });

      return farm;
    }

    const farm = await this.prisma.farm.create({
      data: {
        name,
        location,
        capacity,
        userId: user.id,
        ...trialCreateData(),
      },
    });

    await this.prisma.farmMember.create({
      data: { farmId: farm.id, userId: user.id, role: 'OWNER' },
    });

    await this.prisma.farmSettings.create({
      data: { farmId: farm.id, currency: 'GHS', eggsPerCrate: 30 },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: 'OWNER' },
    });

    return farm;
  }

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
