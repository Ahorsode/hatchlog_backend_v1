import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type { RequestUpgradeDto } from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';
import { isPaidMasterStatus, resolveFarmAccess } from './farm-access-status';

const TIER_MONTHLY_PRICE: Record<string, number> = {
  STANDARD: 350,
  PREMIUM: 950,
};

const TERM_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0.05,
  6: 0.1,
  12: 0.15,
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
      },
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return resolveFarmAccess(farm);
  }

  async requestUpgrade(user: AuthUser, dto: RequestUpgradeDto) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;
    const tier = dto.tier;

    if (tier !== 'STANDARD' && tier !== 'PREMIUM') {
      throw new BadRequestException('Select a paid plan to upgrade');
    }

    const normalizedMonths = [1, 3, 6, 12].includes(dto.months ?? 1)
      ? (dto.months ?? 1)
      : 1;

    const monthly = TIER_MONTHLY_PRICE[tier];
    const discount = TERM_DISCOUNTS[normalizedMonths] ?? 0;
    const total =
      Math.round(monthly * normalizedMonths * (1 - discount) * 100) / 100;

    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        subscriptionTier: true,
        masterLicenseStatus: true,
        name: true,
      },
    });

    if (!farm) throw new NotFoundException('Farm not found');

    if (
      isPaidMasterStatus(farm.masterLicenseStatus) &&
      farm.subscriptionTier === tier
    ) {
      throw new BadRequestException('You are already on this plan');
    }

    await this.prisma.subscriptionEvent.create({
      data: {
        farmId,
        userId: user.id,
        eventType: 'UPGRADE_REQUESTED',
        metadata: {
          requestedTier: tier,
          months: normalizedMonths,
          monthlyPrice: monthly,
          discount,
          totalAmount: total,
          currency: 'GHS',
          status: 'PENDING_PAYMENT',
          farmName: farm.name,
        },
      },
    });

    return {
      success: true,
      pending: true,
      totalAmount: total,
      months: normalizedMonths,
      message:
        'Upgrade request submitted. Complete payment via Mobile Money and contact support with your farm name to activate your plan.',
    };
  }
}
