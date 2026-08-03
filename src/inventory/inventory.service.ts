import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateInventoryDto,
  InventoryQueryDto,
  UpdateInventoryDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const HEALTH_INVENTORY_CATEGORIES = [
  'MEDICINE',
  'MEDICATION',
  'MEDICATIONS',
  'VETERINARY',
  'HEALTH',
  'VACCINE',
  'VACCINATION',
  'VACCINES',
];

const EGG_INVENTORY_CATEGORIES = ['EGG', 'EGGS', 'EGG_STOCK', 'EGG_INVENTORY'];

const INVENTORY_INCLUDE = {
  eggCategory: true,
  user: { select: { firstname: true, surname: true, role: true } },
} as const;

function mapInventoryRow(item: any) {
  return {
    ...item,
    stockLevel: Number(item.stockLevel),
    reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
    costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
    eggCategory: item.eggCategory
      ? {
          ...item.eggCategory,
          sellingPrice: Number(item.eggCategory.sellingPrice),
          unitSize: Number(item.eggCategory.unitSize),
        }
      : null,
    sellingPrice:
      item.eggCategory?.sellingPrice != null
        ? Number(item.eggCategory.sellingPrice)
        : item.costPerUnit
          ? Number(item.costPerUnit)
          : null,
  };
}

function normalizeHealthInput<
  T extends { category?: string; usageType?: string; stockLevel?: number },
>(data: T): T {
  const category = String(data.category || '').toUpperCase();
  if (!HEALTH_INVENTORY_CATEGORIES.includes(category)) return data;
  if (data.usageType !== 'ONE_TIME') return data;
  return { ...data, stockLevel: 1 };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: InventoryQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    const filter = query.filter ?? 'active';

    const stockFilter =
      filter === 'active'
        ? { stockLevel: { gt: 0 } }
        : filter === 'used_up'
          ? { stockLevel: { lte: 0 } }
          : {};

    const items = await this.prisma.inventory.findMany({
      where: { farmId: query.farm_id, isDeleted: false, ...stockFilter },
      include: INVENTORY_INCLUDE,
      orderBy: { itemName: 'asc' },
      take,
    });

    return items.map(mapInventoryRow);
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const item = await this.prisma.inventory.findFirst({
      where: { id, farmId, isDeleted: false },
      include: INVENTORY_INCLUDE,
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    return mapInventoryRow(item);
  }

  async create(user: AuthUser, dto: CreateInventoryDto) {
    assertFarmAccess(user, dto.farm_id);

    const payload = normalizeHealthInput(dto);

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inventory.create({
        data: {
          itemName: payload.itemName,
          stockLevel: payload.stockLevel,
          unit: payload.unit,
          category: payload.category,
          costPerUnit: payload.costPerUnit,
          usageType: payload.usageType,
          supplierId: payload.supplierId,
          eggCategoryId: payload.eggCategoryId,
          userId: user.id,
          farmId: dto.farm_id,
        },
      });

      const totalCost = payload.stockLevel * (payload.costPerUnit || 0);
      const amountToLog =
        dto.paymentPlan === 'full' ? totalCost : (dto.amountPaid || 0);

      if (amountToLog > 0) {
        const expenseCategory =
          dto.category === 'FEED'
            ? 'FEED'
            : dto.category === 'MEDICINE'
              ? 'MEDICATION'
              : 'OTHER';

        await tx.expense.create({
          data: {
            farmId: dto.farm_id,
            userId: user.id,
            amount: amountToLog,
            category: expenseCategory as any,
            description: `Inventory Purchase: ${payload.itemName} (${payload.stockLevel} ${payload.unit})`,
            supplierId: dto.supplierId,
            expenseDate: new Date(),
          },
        });
      }

      if (
        dto.supplierId &&
        (dto.paymentPlan === 'installments' || dto.paymentPlan === 'none')
      ) {
        const debt = totalCost - (dto.amountPaid || 0);
        if (debt > 0) {
          await tx.supplier.update({
            where: { id: dto.supplierId },
            data: { balanceOwed: { increment: debt } },
          });
        }
      }

      return created;
    });

    return { ...item, stockLevel: Number(item.stockLevel) };
  }

  async update(user: AuthUser, id: string, dto: UpdateInventoryDto) {
    const existing = await this.prisma.inventory.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, farmId: true },
    });
    if (!existing) throw new NotFoundException('Inventory item not found');

    assertFarmAccess(user, existing.farmId);

    const payload = normalizeHealthInput(dto);
    const item = await this.prisma.inventory.update({
      where: { id },
      data: {
        ...(payload.itemName !== undefined ? { itemName: payload.itemName } : {}),
        ...(payload.stockLevel !== undefined
          ? { stockLevel: payload.stockLevel }
          : {}),
        ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.costPerUnit !== undefined
          ? { costPerUnit: payload.costPerUnit }
          : {}),
        ...(payload.supplierId !== undefined
          ? { supplierId: payload.supplierId }
          : {}),
        ...(payload.usageType !== undefined
          ? { usageType: payload.usageType }
          : {}),
      },
    });

    return { ...item, stockLevel: Number(item.stockLevel) };
  }

  async remove(
    user: AuthUser,
    id: string,
    farmId: string,
    reason?: string,
  ) {
    assertFarmAccess(user, farmId);

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException(
        'A valid reason (min 5 chars) is required for deletion',
      );
    }

    const existing = await this.prisma.inventory.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Inventory item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.deleteLog.create({
        data: {
          userId: user.id,
          farmId,
          tableName: 'inventory',
          deletedDataCsv: JSON.stringify(existing),
          reason: reason.trim(),
        },
      });

      await tx.inventory.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const existing = await this.prisma.inventory.findFirst({
      where: { id, farmId, isDeleted: true },
    });
    if (!existing) throw new NotFoundException('Deleted inventory item not found');

    await this.prisma.inventory.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { success: true };
  }

  async getEggStock(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const [sellableItems, batchStock, fifoMap] = await Promise.all([
      this.getSellableEggInventory(farmId),
      this.getActiveBatchEggStock(farmId),
      this.getEggFifoAvailabilityMap(farmId),
    ]);

    return { sellableItems, batchStock, fifoMap };
  }

  private async getSellableEggInventory(farmId: string) {
    const items = await this.prisma.inventory.findMany({
      where: {
        farmId,
        isDeleted: false,
        OR: [
          { category: { in: EGG_INVENTORY_CATEGORIES } },
          { eggCategoryId: { not: null } },
        ],
        stockLevel: { gt: 0 },
      },
      include: INVENTORY_INCLUDE,
      orderBy: { itemName: 'asc' },
    });
    return items.map(mapInventoryRow);
  }

  private async getActiveBatchEggStock(farmId: string) {
    const logs = await this.prisma.eggProduction.findMany({
      where: {
        farmId,
        isDeleted: false,
        eggsRemaining: { gt: 0 },
        batch: {
          status: { equals: 'active', mode: 'insensitive' },
          type: 'POULTRY_LAYER',
          isDeleted: false,
        },
      },
      select: {
        eggsRemaining: true,
        batch: { select: { id: true, batchName: true } },
      },
    });

    const byBatch = new Map<
      string,
      { batchId: string; batchName: string; eggsRemaining: number }
    >();
    for (const log of logs) {
      const batchId = log.batch?.id;
      if (!batchId) continue;
      const remaining = Number(log.eggsRemaining || 0);
      const entry = byBatch.get(batchId);
      if (entry) {
        entry.eggsRemaining += remaining;
      } else {
        byBatch.set(batchId, {
          batchId,
          batchName: log.batch?.batchName || 'Batch',
          eggsRemaining: remaining,
        });
      }
    }

    const batches = Array.from(byBatch.values()).sort((a, b) =>
      a.batchName.localeCompare(b.batchName),
    );
    const totalEggs = batches.reduce((sum, row) => sum + row.eggsRemaining, 0);
    return { totalEggs, batches };
  }

  private async getEggFifoAvailabilityMap(farmId: string) {
    const logs = await this.prisma.eggProduction.findMany({
      where: {
        farmId,
        isDeleted: false,
        eggsRemaining: { gt: 0 },
        batch: {
          status: { equals: 'active', mode: 'insensitive' },
          type: 'POULTRY_LAYER',
          isDeleted: false,
        },
      },
      select: { eggsRemaining: true, categoryId: true },
    });

    const byCategoryId: Record<string, number> = {};
    let totalEggs = 0;
    for (const log of logs) {
      const remaining = Number(log.eggsRemaining || 0);
      totalEggs += remaining;
      const key = log.categoryId ? String(log.categoryId) : '__uncategorized__';
      byCategoryId[key] = (byCategoryId[key] || 0) + remaining;
    }

    return { totalEggs, byCategoryId };
  }
}
