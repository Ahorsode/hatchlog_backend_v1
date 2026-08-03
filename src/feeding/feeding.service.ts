import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedType, LivestockType } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateFeedFormulationDto,
  CreateFeedingDto,
  FarmScopedQueryDto,
  ListQueryDto,
  UpdateFeedingDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

const FEED_TYPES = new Set<string>(Object.values(FeedType));
const LIVESTOCK_TYPES = new Set<string>(Object.values(LivestockType));

@Injectable()
export class FeedingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    return this.prisma.feedingLog.findMany({
      where: {
        farmId: query.farm_id,
        isDeleted: false,
        ...(query.batch_id ? { batchId: query.batch_id } : {}),
      },
      orderBy: { logDate: 'desc' },
      take,
      include: {
        batch: { select: { id: true, batchName: true } },
        inventory: { select: { id: true, itemName: true } },
        formulation: { select: { id: true, name: true } },
      },
    });
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const log = await this.prisma.feedingLog.findFirst({
      where: { id, farmId, isDeleted: false },
      include: {
        batch: true,
        inventory: true,
        formulation: true,
      },
    });
    if (!log) throw new NotFoundException('Feeding log not found');
    return log;
  }

  async create(user: AuthUser, dto: CreateFeedingDto) {
    assertFarmAccess(user, dto.farm_id);

    const amountConsumed = Number(dto.amountConsumed);
    if (!Number.isFinite(amountConsumed) || amountConsumed <= 0) {
      throw new BadRequestException(
        'Amount consumed must be greater than zero',
      );
    }
    if (!dto.feedTypeId && !dto.formulationId) {
      throw new BadRequestException('Select a feed source before saving');
    }

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.livestock.findFirst({
        where: {
          id: dto.batchId,
          farmId: dto.farm_id,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (!batch) {
        throw new BadRequestException('Selected batch was not found');
      }

      if (dto.feedTypeId) {
        const feedItem = await tx.inventory.findFirst({
          where: {
            id: dto.feedTypeId,
            farmId: dto.farm_id,
            isDeleted: false,
          },
          select: { id: true, stockLevel: true, itemName: true },
        });
        if (!feedItem) {
          throw new BadRequestException(
            'Selected feed inventory item was not found',
          );
        }
        if (Number(feedItem.stockLevel) < amountConsumed) {
          throw new BadRequestException(
            `Insufficient stock for ${feedItem.itemName} (${Number(feedItem.stockLevel)} bags available)`,
          );
        }
      } else if (dto.formulationId) {
        const formulation = await tx.feedFormulation.findFirst({
          where: { id: dto.formulationId, farmId: dto.farm_id },
          select: { id: true, stockLevel: true, name: true },
        });
        if (!formulation) {
          throw new BadRequestException(
            'Selected feed formulation was not found',
          );
        }
        if (Number(formulation.stockLevel) < amountConsumed) {
          throw new BadRequestException(
            `Insufficient stock for ${formulation.name} (${Number(formulation.stockLevel)} bags available)`,
          );
        }
      }

      const created = await tx.feedingLog.create({
        data: {
          batchId: dto.batchId,
          feedTypeId: dto.feedTypeId || null,
          formulationId: dto.formulationId || null,
          amountConsumed,
          logDate: requireDate(dto.logDate, 'logDate'),
          farmId: dto.farm_id,
          userId: user.id,
        },
      });

      if (dto.feedTypeId) {
        await tx.inventory.update({
          where: { id: dto.feedTypeId },
          data: { stockLevel: { decrement: amountConsumed } },
        });
      } else if (dto.formulationId) {
        await tx.feedFormulation.update({
          where: { id: dto.formulationId },
          data: { stockLevel: { decrement: amountConsumed } },
        });
      }

      return created;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateFeedingDto) {
    const existing = await this.prisma.feedingLog.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Feeding log not found');
    }
    assertFarmAccess(user, existing.farmId);

    return this.prisma.feedingLog.update({
      where: { id },
      data: {
        ...(dto.amountConsumed !== undefined
          ? { amountConsumed: dto.amountConsumed }
          : {}),
        ...(dto.logDate !== undefined
          ? { logDate: requireDate(dto.logDate, 'logDate') }
          : {}),
        ...(dto.feedTypeId !== undefined
          ? { feedTypeId: dto.feedTypeId }
          : {}),
        ...(dto.formulationId !== undefined
          ? { formulationId: dto.formulationId }
          : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.feedingLog.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Feeding log not found');
    }
    assertFarmAccess(user, existing.farmId);

    await this.prisma.feedingLog.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const existing = await this.prisma.feedingLog.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Feeding log not found');

    return this.prisma.feedingLog.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  // ── Feed Formulations ──

  async listFormulations(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    return this.prisma.feedFormulation.findMany({
      where: { farmId: query.farm_id },
      include: {
        ingredients: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFormulation(user: AuthUser, dto: CreateFeedFormulationDto) {
    assertFarmAccess(user, dto.farm_id);

    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Formulation name is required');
    }
    if (!FEED_TYPES.has(dto.type)) {
      throw new BadRequestException(`Invalid feed type: ${dto.type}`);
    }
    if (!dto.ingredients.length) {
      throw new BadRequestException('Add at least one ingredient');
    }
    if (
      dto.targetLivestock &&
      !LIVESTOCK_TYPES.has(dto.targetLivestock)
    ) {
      throw new BadRequestException(
        `Invalid target livestock: ${dto.targetLivestock}`,
      );
    }

    const ingredients = dto.ingredients.map((ing) => ({
      inventoryId: ing.inventoryId,
      quantity: Number(ing.quantity ?? ing.percentage ?? ing.bags ?? 0),
    }));

    if (ingredients.some((i) => !i.inventoryId)) {
      throw new BadRequestException(
        'Each ingredient must have an inventory source',
      );
    }
    if (
      ingredients.some(
        (i) => !Number.isFinite(i.quantity) || i.quantity <= 0,
      )
    ) {
      throw new BadRequestException(
        'Each ingredient must use at least one bag',
      );
    }

    const totalBags = ingredients.reduce((s, i) => s + i.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      for (const ingredient of ingredients) {
        const item = await tx.inventory.findFirst({
          where: {
            id: ingredient.inventoryId,
            farmId: dto.farm_id,
            isDeleted: false,
          },
          select: { id: true, stockLevel: true, itemName: true },
        });
        if (!item) {
          throw new BadRequestException(
            'Ingredient inventory item not found',
          );
        }
        if (Number(item.stockLevel) < ingredient.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.itemName} (${Number(item.stockLevel)} available)`,
          );
        }
      }

      const created = await tx.feedFormulation.create({
        data: {
          farmId: dto.farm_id,
          name: trimmedName,
          type: dto.type as FeedType,
          targetLivestock: dto.targetLivestock
            ? (dto.targetLivestock as LivestockType)
            : null,
          stockLevel: totalBags,
          ingredients: {
            create: ingredients.map((i) => ({
              inventoryId: i.inventoryId,
              quantity: i.quantity,
              unit: 'bag',
            })),
          },
        },
        include: { ingredients: true },
      });

      for (const ingredient of ingredients) {
        await tx.inventory.update({
          where: { id: ingredient.inventoryId },
          data: { stockLevel: { decrement: ingredient.quantity } },
        });
      }

      return created;
    });
  }

  async deleteFormulation(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const existing = await this.prisma.feedFormulation.findFirst({
      where: { id, farmId },
    });
    if (!existing) {
      throw new NotFoundException('Feed formulation not found');
    }

    await this.prisma.feedFormulation.delete({ where: { id } });
    return { success: true };
  }
}
