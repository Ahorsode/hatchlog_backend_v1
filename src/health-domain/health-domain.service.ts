import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateHealthSchedulesBulkDto,
  DeleteHealthScheduleDto,
  HealthScheduleQueryDto,
  RegisterHealthInventoryItemDto,
  SetHealthItemCostDto,
  UpdateHealthScheduleStatusDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const VACCINE_CATEGORIES = ['VACCINE', 'VACCINATION', 'VACCINES'];
const MEDICINE_CATEGORIES = [
  'MEDICINE',
  'MEDICATION',
  'MEDICATIONS',
  'VETERINARY',
  'HEALTH',
];
const ALL_HEALTH_CATEGORIES = [...VACCINE_CATEGORIES, ...MEDICINE_CATEGORIES];
const VALID_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'] as const;
type HealthStatus = (typeof VALID_STATUSES)[number];

function normalizeUsageType(value?: string | null): 'ONE_TIME' | 'QUANTITY' {
  return value === 'QUANTITY' ? 'QUANTITY' : 'ONE_TIME';
}

@Injectable()
export class HealthDomainService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchedules(user: AuthUser, query: HealthScheduleQueryDto) {
    assertFarmAccess(user, query.farm_id);

    const batchFilter = query.batch_id
      ? { batchId: query.batch_id }
      : {};

    const [vaccinations, medications] = await Promise.all([
      this.prisma.vaccinationSchedule.findMany({
        where: { farmId: query.farm_id, ...batchFilter },
        include: {
          batch: { select: { id: true, batchName: true, type: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.medicationSchedule.findMany({
        where: { farmId: query.farm_id, ...batchFilter },
        include: {
          batch: { select: { id: true, batchName: true, type: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
    ]);

    return { vaccinations, medications };
  }

  async createSchedulesBulk(user: AuthUser, dto: CreateHealthSchedulesBulkDto) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    if (!dto.entries?.length) {
      throw new BadRequestException('Add at least one vaccine or medication');
    }

    const normalized = dto.entries.map((e) => this.normalizeEntry(e));

    return this.prisma.$transaction(async (tx) => {
      const batchIds = [...new Set(normalized.map((e) => e.batchId))];
      const ownedBatches = await tx.livestock.findMany({
        where: { id: { in: batchIds }, farmId },
        select: { id: true },
      });
      const ownedSet = new Set(ownedBatches.map((b) => b.id));
      for (const id of batchIds) {
        if (!ownedSet.has(id)) {
          throw new BadRequestException(
            'A selected batch was not found on this farm',
          );
        }
      }

      for (const e of normalized) {
        if (e.isNewItem) {
          const category = e.type === 'VACCINATION' ? 'VACCINE' : 'MEDICINE';
          const existing = await tx.inventory.findFirst({
            where: {
              farmId,
              isDeleted: false,
              category: { in: ALL_HEALTH_CATEGORIES },
              itemName: { equals: e.name, mode: 'insensitive' },
            },
            select: { id: true },
          });
          if (!existing) {
            await tx.inventory.create({
              data: {
                itemName: e.name,
                stockLevel: e.usageType === 'ONE_TIME' ? 1 : (e.quantity ?? 0),
                unit: e.unit || 'dose',
                category,
                usageType: e.usageType,
                costPerUnit: null,
                userId: user.id,
                farmId,
              },
            });
          }
        }

        if (e.type === 'VACCINATION') {
          await tx.vaccinationSchedule.create({
            data: {
              batchId: e.batchId,
              vaccineName: e.name,
              scheduledDate: e.scheduledDate,
              status: e.status,
              notes: e.notes,
              quantity: e.quantity,
              usageType: e.usageType,
              unit: e.unit,
              farmId,
            },
          });
        } else {
          await tx.medicationSchedule.create({
            data: {
              batchId: e.batchId,
              medicationName: e.name,
              scheduledDate: e.scheduledDate,
              status: e.status,
              notes: e.notes,
              quantity: e.quantity,
              usageType: e.usageType,
              unit: e.unit,
              farmId,
            },
          });
        }

        if (e.status === 'COMPLETED') {
          await this.consumeInventory(tx, farmId, {
            name: e.name,
            usageType: e.usageType,
            quantity: e.quantity,
          });
        }
      }

      return { success: true, created: normalized.length };
    });
  }

  async updateScheduleStatus(
    user: AuthUser,
    id: string,
    dto: UpdateHealthScheduleStatusDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;
    const status = VALID_STATUSES.includes(dto.status as HealthStatus)
      ? (dto.status as HealthStatus)
      : 'PENDING';

    return this.prisma.$transaction(async (tx) => {
      const model =
        dto.type === 'VACCINATION'
          ? tx.vaccinationSchedule
          : tx.medicationSchedule;

      const schedule = await (model as any).findFirst({
        where: { id, farmId },
      });
      if (!schedule) throw new NotFoundException('Schedule not found');

      const name =
        dto.type === 'VACCINATION'
          ? schedule.vaccineName
          : schedule.medicationName;
      const oldStatus = schedule.status as HealthStatus;
      const usageType = schedule.usageType;
      const quantity =
        schedule.quantity != null ? Number(schedule.quantity) : null;

      if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        await this.consumeInventory(tx, farmId, { name, usageType, quantity });
      } else if (oldStatus === 'COMPLETED' && status !== 'COMPLETED') {
        await this.restoreInventory(tx, farmId, { name, usageType, quantity });
      }

      await (model as any).updateMany({
        where: { id, farmId },
        data: { status },
      });

      return { success: true };
    });
  }

  async deleteSchedule(
    user: AuthUser,
    id: string,
    dto: DeleteHealthScheduleDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    const model =
      dto.type === 'VACCINATION'
        ? this.prisma.vaccinationSchedule
        : this.prisma.medicationSchedule;

    const result = await (model as any).deleteMany({
      where: { id, farmId },
    });

    if (result.count === 0) throw new NotFoundException('Schedule not found');
    return { success: true };
  }

  async getHealthInventory(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const items = await this.prisma.inventory.findMany({
      where: {
        farmId,
        isDeleted: false,
        stockLevel: { gt: 0 },
        category: { in: ALL_HEALTH_CATEGORIES },
      },
      select: {
        id: true,
        itemName: true,
        stockLevel: true,
        unit: true,
        category: true,
        usageType: true,
      },
      orderBy: { itemName: 'asc' },
    });

    const vaccine: any[] = [];
    const medicine: any[] = [];
    for (const item of items) {
      const option = {
        id: item.id,
        itemName: item.itemName,
        stockLevel: Number(item.stockLevel),
        unit: item.unit,
        usageType: item.usageType ?? null,
      };
      if (
        VACCINE_CATEGORIES.includes(
          String(item.category).toUpperCase(),
        )
      ) {
        vaccine.push(option);
      } else {
        medicine.push(option);
      }
    }

    return { vaccine, medicine };
  }

  async registerHealthInventoryItem(
    user: AuthUser,
    dto: RegisterHealthInventoryItemDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Enter a name for the item');

    const usageType = normalizeUsageType(dto.usageType);
    const unit = dto.unit?.trim() || (usageType === 'ONE_TIME' ? 'dose' : 'unit');
    let stockLevel: number;
    if (usageType === 'ONE_TIME') {
      stockLevel = 1;
    } else {
      stockLevel = Number(dto.quantity);
      if (!Number.isFinite(stockLevel) || stockLevel <= 0) {
        throw new BadRequestException(
          `Enter a valid opening stock quantity for "${name}"`,
        );
      }
    }

    const existing = await this.prisma.inventory.findFirst({
      where: {
        farmId,
        isDeleted: false,
        category: { in: ALL_HEALTH_CATEGORIES },
        itemName: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, itemName: true },
    });

    if (existing) {
      return {
        success: true,
        created: false,
        itemName: existing.itemName,
        message: `"${existing.itemName}" is already in inventory.`,
      };
    }

    const category = dto.type === 'VACCINATION' ? 'VACCINE' : 'MEDICINE';
    const item = await this.prisma.inventory.create({
      data: {
        itemName: name,
        stockLevel,
        unit,
        category,
        usageType,
        costPerUnit: null,
        userId: user.id,
        farmId,
      },
    });

    return {
      success: true,
      created: true,
      itemName: item.itemName,
      message: `"${item.itemName}" added to inventory.`,
    };
  }

  async setHealthItemCost(
    user: AuthUser,
    inventoryId: string,
    dto: SetHealthItemCostDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;
    const cost = dto.costPerUnit;

    const item = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        farmId,
        isDeleted: false,
        category: { in: ALL_HEALTH_CATEGORIES },
      },
      select: { id: true, itemName: true, stockLevel: true, unit: true },
    });
    if (!item) throw new NotFoundException('Health inventory item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: item.id },
        data: { costPerUnit: cost },
      });

      const stock = Number(item.stockLevel);
      if (cost > 0 && stock > 0) {
        await tx.expense.create({
          data: {
            farmId,
            userId: user.id,
            amount: cost * stock,
            category: 'MEDICATION',
            description: `Health stock cost: ${item.itemName} (${stock} ${item.unit} × ${cost})`,
            expenseDate: new Date(),
          },
        });
      }
    });

    return { success: true };
  }

  private normalizeEntry(entry: {
    type: string;
    batchId: string;
    name: string;
    isNewItem?: boolean;
    scheduledDate: string;
    status?: string;
    usageType?: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }) {
    const name = entry.name?.trim();
    if (!entry.batchId) throw new BadRequestException('A batch is required');
    if (!name) throw new BadRequestException('A name is required');
    if (!entry.scheduledDate)
      throw new BadRequestException('A scheduled date is required');

    const scheduledDate = new Date(entry.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime()))
      throw new BadRequestException('Invalid scheduled date');

    const status: HealthStatus = VALID_STATUSES.includes(
      entry.status as HealthStatus,
    )
      ? (entry.status as HealthStatus)
      : 'PENDING';

    const usageType = normalizeUsageType(entry.usageType);
    const unit =
      entry.unit?.trim() || (usageType === 'ONE_TIME' ? 'dose' : null);

    let quantity: number | null;
    if (usageType === 'ONE_TIME') {
      quantity = 1;
    } else {
      quantity = Number(entry.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Enter a valid quantity for "${name}"`,
        );
      }
    }

    return {
      type: entry.type as 'VACCINATION' | 'MEDICATION',
      batchId: entry.batchId,
      name,
      isNewItem: !!entry.isNewItem,
      scheduledDate,
      status,
      usageType,
      quantity,
      unit,
      notes: entry.notes?.trim() || null,
    };
  }

  private async findHealthItem(tx: any, farmId: string, name: string) {
    return tx.inventory.findFirst({
      where: {
        farmId,
        isDeleted: false,
        category: { in: ALL_HEALTH_CATEGORIES },
        itemName: { equals: name, mode: 'insensitive' },
      },
      select: {
        id: true,
        itemName: true,
        stockLevel: true,
        unit: true,
        usageType: true,
      },
    });
  }

  private async consumeInventory(
    tx: any,
    farmId: string,
    params: { name: string; usageType: string | null; quantity: number | null },
  ) {
    const item = await this.findHealthItem(tx, farmId, params.name);
    if (!item) return;

    const usageType = normalizeUsageType(params.usageType ?? item.usageType);
    const stock = Number(item.stockLevel) || 0;
    if (stock <= 0) {
      throw new BadRequestException(
        `"${params.name}" is no longer in stock.`,
      );
    }

    if (usageType === 'ONE_TIME') {
      await tx.inventory.update({
        where: { id: item.id },
        data: { stockLevel: 0 },
      });
      return;
    }

    const deduct = Number(params.quantity) || 0;
    if (deduct <= 0)
      throw new BadRequestException(
        `Enter a valid quantity for "${params.name}".`,
      );
    if (stock < deduct)
      throw new BadRequestException(
        `Not enough "${params.name}" in stock (${stock} ${item.unit} available, ${deduct} requested).`,
      );

    await tx.inventory.update({
      where: { id: item.id },
      data: { stockLevel: Math.max(0, stock - deduct) },
    });
  }

  private async restoreInventory(
    tx: any,
    farmId: string,
    params: { name: string; usageType: string | null; quantity: number | null },
  ) {
    const item = await this.findHealthItem(tx, farmId, params.name);
    if (!item) return;

    const usageType = normalizeUsageType(params.usageType ?? item.usageType);
    const stock = Number(item.stockLevel) || 0;

    if (usageType === 'ONE_TIME') {
      await tx.inventory.update({
        where: { id: item.id },
        data: { stockLevel: 1 },
      });
      return;
    }

    const restore = Number(params.quantity) || 0;
    if (restore <= 0) return;

    await tx.inventory.update({
      where: { id: item.id },
      data: { stockLevel: stock + restore },
    });
  }
}
