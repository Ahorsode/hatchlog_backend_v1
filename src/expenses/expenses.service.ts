import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import type {
  CreateExpenseDto,
  DeleteExpenseDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const EXPENSE_CATEGORIES = new Set([
  'FEED',
  'MEDICATION',
  'EQUIPMENT',
  'UTILITIES',
  'SALARY',
  'MAINTENANCE',
  'OTHER',
  'LIVESTOCK_PURCHASE',
  'TRANSPORT',
]);

function normalizeCategory(category: string) {
  const mapped = category === 'LABOR' ? 'SALARY' : category;
  return EXPENSE_CATEGORIES.has(mapped) ? mapped : 'OTHER';
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const expenses = await this.prisma.expense.findMany({
      where: { farmId, isDeleted: false },
      include: {
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { expenseDate: 'desc' },
      take: 50,
    });

    return expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
    }));
  }

  async getActiveAllocationBatches(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const batches = await this.prisma.livestock.findMany({
      where: { farmId, status: 'active', isDeleted: false },
      select: {
        id: true,
        batchName: true,
        breedType: true,
        type: true,
        currentCount: true,
        localBatchId: true,
        house: { select: { name: true } },
      },
      orderBy: [{ batchName: 'asc' }, { arrivalDate: 'desc' }],
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.batchName || `Batch ${b.localBatchId || b.id}`,
      breedType: b.breedType,
      type: b.type,
      currentCount: b.currentCount,
      localBatchId: b.localBatchId,
      houseName: b.house?.name || 'Unassigned',
    }));
  }

  async create(user: AuthUser, dto: CreateExpenseDto) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const dbCategory = normalizeCategory(dto.category);
    const dbDescription = dto.reference
      ? `[Ref: ${dto.reference}] ${dto.description || ''}`.trim()
      : dto.description;

    const allocations = (dto.allocations || []).filter((a) => a.batchId);

    return this.prisma.$transaction(async (tx) => {
      if (allocations.length > 0) {
        const uniqueIds = [...new Set(allocations.map((a) => a.batchId))];
        if (uniqueIds.length !== allocations.length) {
          throw new BadRequestException(
            'Each batch can only appear once in an allocation.',
          );
        }
        const activeBatches = await tx.livestock.findMany({
          where: { farmId, id: { in: uniqueIds }, status: 'active', isDeleted: false },
          select: { id: true },
        });
        if (activeBatches.length !== uniqueIds.length) {
          throw new BadRequestException(
            'One or more selected batches are no longer active.',
          );
        }
      }

      const expenseDate = dto.expenseDate
        ? requireDate(dto.expenseDate, 'expenseDate')
        : new Date();

      const expense = await tx.expense.create({
        data: {
          farmId,
          userId: user.id,
          amount: dto.amount,
          category: dbCategory as any,
          description: dbDescription || null,
          expenseDate,
          supplierId: dto.supplierId || null,
        },
      });

      if (allocations.length > 0 && dto.allocationMode) {
        const rows = this.prepareAllocations(
          expense.id,
          farmId,
          dto.amount,
          dto.allocationMode,
          allocations,
        );
        if (rows.length > 0) {
          await tx.expenseAllocation.createMany({ data: rows });
        }
      }

      return { success: true, expense: { ...expense, amount: Number(expense.amount) } };
    });
  }

  async remove(user: AuthUser, id: string, dto: DeleteExpenseDto) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException(
        'A valid reason (min 5 chars) is required for deletion',
      );
    }

    const existing = await this.prisma.expense.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.deleteLog.create({
        data: {
          userId: user.id,
          farmId,
          tableName: 'expenses',
          deletedDataCsv: JSON.stringify(existing),
          reason: dto.reason.trim(),
        },
      });

      await tx.expense.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const existing = await this.prisma.expense.findFirst({
      where: { id, farmId, isDeleted: true },
    });
    if (!existing) throw new NotFoundException('Deleted expense not found');

    await this.prisma.expense.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { success: true };
  }

  private prepareAllocations(
    expenseId: string,
    farmId: string,
    totalAmount: number,
    mode: 'PERCENTAGE' | 'AMOUNT',
    allocations: { batchId: string; percentage?: number; amount?: number }[],
  ) {
    if (mode === 'PERCENTAGE') {
      const percentTotal = allocations.reduce(
        (sum, a) => sum + (a.percentage || 0),
        0,
      );
      if (Math.abs(percentTotal - 100) > 0.01) {
        throw new BadRequestException(
          'Allocation percentages must equal exactly 100%.',
        );
      }

      let allocatedCents = 0;
      return allocations.map((a, i) => {
        const isLast = i === allocations.length - 1;
        const amount = isLast
          ? roundMoney(totalAmount - allocatedCents / 100)
          : roundMoney((totalAmount * (a.percentage || 0)) / 100);
        allocatedCents += toCents(amount);

        return {
          expenseId,
          batchId: a.batchId,
          farmId,
          allocatedAmount: amount,
          allocationPercentage: a.percentage || 0,
        };
      });
    }

    const amountTotalCents = allocations.reduce(
      (sum, a) => sum + toCents(a.amount || 0),
      0,
    );
    if (amountTotalCents !== toCents(totalAmount)) {
      throw new BadRequestException(
        'Allocated amounts must match the base expense amount.',
      );
    }

    return allocations.map((a) => ({
      expenseId,
      batchId: a.batchId,
      farmId,
      allocatedAmount: roundMoney(a.amount || 0),
      allocationPercentage:
        totalAmount > 0
          ? Number((((a.amount || 0) / totalAmount) * 100).toFixed(4))
          : null,
    }));
  }
}
