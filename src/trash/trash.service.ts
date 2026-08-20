import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

const RESTORABLE_MODELS: Record<string, string> = {
  livestock: 'livestock',
  batches: 'livestock',
  feedingLogs: 'feedingLog',
  eggProduction: 'eggProduction',
  mortality: 'healthMortality',
  expenses: 'expense',
  sales: 'sale',
  orders: 'order',
  inventory: 'inventory',
};

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const [
      batches,
      feedingLogs,
      eggProduction,
      mortality,
      expenses,
      sales,
      orders,
      inventory,
    ] = await Promise.all([
      this.prisma.livestock.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          batchName: true,
          breedType: true,
          initialCount: true,
          currentCount: true,
          arrivalDate: true,
          status: true,
          type: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.feedingLog.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          amountConsumed: true,
          logDate: true,
          batchId: true,
          batch: { select: { batchName: true } },
        },
        orderBy: { logDate: 'desc' },
        take: 100,
      }),
      this.prisma.eggProduction.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          eggsCollected: true,
          unusableCount: true,
          logDate: true,
          batchId: true,
          batch: { select: { batchName: true } },
        },
        orderBy: { logDate: 'desc' },
        take: 100,
      }),
      this.prisma.healthMortality.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          count: true,
          type: true,
          reason: true,
          logDate: true,
          batchId: true,
          batch: { select: { batchName: true } },
        },
        orderBy: { logDate: 'desc' },
        take: 100,
      }),
      this.prisma.expense.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          expenseDate: true,
        },
        orderBy: { expenseDate: 'desc' },
        take: 100,
      }),
      this.prisma.sale.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          saleDate: true,
          status: true,
          items: {
            select: { description: true, quantity: true, unitPrice: true },
          },
        },
        orderBy: { saleDate: 'desc' },
        take: 100,
      }),
      this.prisma.order.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          orderDate: true,
          customer: { select: { name: true } },
          items: {
            select: { description: true, quantity: true, unitPrice: true },
          },
        },
        orderBy: { orderDate: 'desc' },
        take: 100,
      }),
      this.prisma.inventory.findMany({
        where: { farmId, isDeleted: true },
        select: {
          id: true,
          itemName: true,
          stockLevel: true,
          unit: true,
          category: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      batches,
      feedingLogs: feedingLogs.map((l) => ({
        ...l,
        amountConsumed: Number(l.amountConsumed),
      })),
      eggProduction,
      mortality,
      expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      sales: sales.map((s) => ({
        ...s,
        totalAmount: Number(s.totalAmount),
        items: s.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
        })),
      })),
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
        })),
      })),
      inventory: inventory.map((i) => ({
        ...i,
        stockLevel: Number(i.stockLevel),
      })),
    };
  }

  async restore(user: AuthUser, table: string, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const modelName = RESTORABLE_MODELS[table];
    if (!modelName) {
      throw new BadRequestException(`Cannot restore from table: ${table}`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model not found: ${modelName}`);
    }

    const record = await model.findFirst({
      where: { id, farmId, isDeleted: true },
    });
    if (!record) {
      throw new NotFoundException('Deleted record not found');
    }

    await model.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { success: true, message: `Record restored in ${table}` };
  }
}
