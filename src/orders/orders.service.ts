import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateOrderDto,
  FarmScopedQueryDto,
  UpdateOrderStatusDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const MONEY_EPSILON = 0.01;

const EGG_CATEGORIES = new Set([
  'EGG',
  'EGGS',
  'EGG_STOCK',
  'EGG_INVENTORY',
]);

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function computeLineDiscount(
  subtotal: number,
  input: number,
  type: 'flat' | 'percent',
): number {
  if (input <= 0) return 0;
  if (type === 'percent') {
    const pct = Math.min(input, 100);
    return toMoney((subtotal * pct) / 100);
  }
  return toMoney(Math.min(input, subtotal));
}

function mapOrder(order: any) {
  return {
    ...order,
    subtotalAmount: Number(order.subtotalAmount || 0),
    taxAmount: Number(order.taxAmount || 0),
    totalAmount: Number(order.totalAmount),
    discountAmount: Number(order.discountAmount),
    cashReceived: Number(order.cashReceived || 0),
    invoiceNumber: order.invoiceNumber ?? null,
    paidAt: order.paidAt ?? null,
    customer: order.customer
      ? {
          ...order.customer,
          balanceOwed: Number(order.customer.balanceOwed),
        }
      : null,
    items: (order.items ?? []).map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      lineDiscountAmount: Number(item.lineDiscountAmount || 0),
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const orders = await this.prisma.order.findMany({
      where: { farmId: query.farm_id, isDeleted: false },
      include: {
        customer: true,
        items: true,
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { orderDate: 'desc' },
      take,
    });

    return orders.map(mapOrder);
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const order = await this.prisma.order.findFirst({
      where: { id, farmId, isDeleted: false },
      include: {
        customer: true,
        items: true,
        user: { select: { firstname: true, surname: true, role: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    return mapOrder(order);
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    assertFarmAccess(user, dto.farm_id);

    if (!dto.items?.length) {
      throw new BadRequestException('At least one order item is required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const normalizedItems = [];

      for (const item of dto.items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new BadRequestException(
            'Quantity must be a positive whole number',
          );
        }
        const unitPrice = toMoney(Number(item.unitPrice || 0));
        if (unitPrice < 0) {
          throw new BadRequestException('Unit price cannot be negative');
        }

        const lineSubtotal = toMoney(quantity * unitPrice);
        const lineDiscountType: 'flat' | 'percent' | 'item' =
          item.lineDiscountType === 'percent'
            ? 'percent'
            : item.lineDiscountType === 'item'
              ? 'item'
              : 'flat';
        const lineDiscountInput = Number(item.lineDiscountAmount || 0);

        const lineDiscount =
          lineDiscountType === 'item'
            ? Math.min(lineSubtotal, Math.max(0, lineDiscountInput))
            : computeLineDiscount(
                lineSubtotal,
                lineDiscountInput,
                lineDiscountType === 'percent' ? 'percent' : 'flat',
              );

        normalizedItems.push({
          description: item.description?.trim() || 'Sale Item',
          quantity,
          unitPrice,
          totalPrice: toMoney(lineSubtotal - lineDiscount),
          lineDiscountAmount: lineDiscount,
          lineDiscountType,
          inventoryId: item.inventoryId || undefined,
          livestockId: item.livestockId || undefined,
          eggAllocationMode: item.eggAllocationMode || null,
          eggBatchId:
            item.eggAllocationMode === 'batch'
              ? (item.eggBatchId || null)
              : null,
        });
      }

      const subtotal = toMoney(
        normalizedItems.reduce((sum, i) => sum + i.totalPrice, 0),
      );
      const discount = toMoney(Number(dto.discountAmount || 0));
      if (discount < 0 || discount > subtotal) {
        throw new BadRequestException(
          'Discount must be between 0 and the subtotal',
        );
      }

      const taxAmount = 0;
      const totalAmount = toMoney(subtotal - discount + taxAmount);
      const cashReceived = toMoney(
        Number(dto.totalCashReceived ?? totalAmount),
      );

      if (cashReceived < 0) {
        throw new BadRequestException(
          'Total cash received cannot be negative',
        );
      }

      const paymentMethod = dto.paymentMethod || 'CASH';
      const isCreditSale = paymentMethod === 'CREDIT';
      const isWalkIn = !dto.customerId;

      if (isWalkIn && isCreditSale) {
        throw new BadRequestException(
          'Walk-in customers cannot use credit sales',
        );
      }

      const isPaid = cashReceived + MONEY_EPSILON >= totalAmount;
      const outstandingBalance = toMoney(
        Math.max(totalAmount - cashReceived, 0),
      );
      const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();

      const order = await tx.order.create({
        data: {
          farmId: dto.farm_id,
          userId: user.id,
          customerId: dto.customerId || undefined,
          subtotalAmount: subtotal,
          taxAmount,
          totalAmount,
          discountAmount: discount,
          cashReceived,
          currency: 'USD',
          status: isPaid ? 'PAID' : 'PENDING',
          paymentMethod,
          paymentReference: dto.paymentReference?.trim() || null,
          paymentAccountName: dto.paymentAccountName?.trim() || null,
          orderDate,
          ...(isPaid ? { paidAt: orderDate } : {}),
          items: {
            create: normalizedItems.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              lineDiscountAmount: i.lineDiscountAmount,
              lineDiscountType: i.lineDiscountType,
              inventoryId: i.inventoryId,
              livestockId: i.livestockId,
              eggAllocationMode: i.eggAllocationMode,
              eggBatchId: i.eggBatchId,
            })),
          },
        },
        include: {
          items: { include: { inventory: true } },
          customer: true,
        },
      } as any);

      const shouldComplete = dto.completeNow === true || isPaid;
      if (shouldComplete) {
        await this.completeOrder(tx, dto.farm_id, order);
      }

      if (dto.customerId && outstandingBalance > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { balanceOwed: { increment: outstandingBalance } },
        });
      }

      const itemSummary = normalizedItems
        .map((line) => `${line.quantity} x ${line.description}`)
        .join(', ');

      await tx.financialTransaction.upsert({
        where: { orderId: order.id },
        create: {
          farmId: dto.farm_id,
          userId: user.id,
          orderId: order.id,
          customerId: dto.customerId || null,
          type: 'INCOME',
          category: 'SALE',
          amount: totalAmount,
          depositAmount: cashReceived,
          outstandingCredit: outstandingBalance,
          paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
          paymentMethod,
          referenceNum: dto.paymentReference?.trim() || null,
          transactionDate: orderDate,
          description: itemSummary || 'Farm-gate sale',
        },
        update: {
          amount: totalAmount,
          depositAmount: cashReceived,
          outstandingCredit: outstandingBalance,
          paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
          paymentMethod,
          transactionDate: orderDate,
          description: itemSummary || 'Farm-gate sale',
        },
      });

      return order;
    });

    return mapOrder(result);
  }

  async updateStatus(
    user: AuthUser,
    id: string,
    dto: UpdateOrderStatusDto,
  ) {
    assertFarmAccess(user, dto.farm_id);

    const order = await this.prisma.order.findFirst({
      where: { id, farmId: dto.farm_id, isDeleted: false },
      include: { items: { include: { inventory: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'COMPLETED' && order.status !== 'COMPLETED') {
        await this.completeOrder(tx, dto.farm_id, order);
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === 'PAID' || dto.status === 'COMPLETED'
            ? { paidAt: new Date() }
            : {}),
        },
        include: {
          items: true,
          customer: true,
          user: { select: { firstname: true, surname: true, role: true } },
        },
      });

      if (order.status === 'COMPLETED' && dto.status !== 'COMPLETED') {
        await this.reverseCompletion(tx, dto.farm_id, order);
      }

      return updated;
    });

    return mapOrder(result);
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

    const existing = await this.prisma.order.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.deleteLog.create({
        data: {
          userId: user.id,
          farmId,
          tableName: 'orders',
          deletedDataCsv: JSON.stringify(existing),
          reason: reason.trim(),
        },
      });

      await tx.order.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const existing = await this.prisma.order.findFirst({
      where: { id, farmId, isDeleted: true },
    });
    if (!existing) throw new NotFoundException('Deleted order not found');

    await this.prisma.order.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { success: true };
  }

  /**
   * Deduct inventory stock and egg production FIFO for completed orders.
   */
  private async completeOrder(tx: any, farmId: string, order: any) {
    for (const item of order.items ?? []) {
      if (item.inventoryId) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { stockLevel: { decrement: item.quantity } },
        });

        const category = String(
          item.inventory?.category || '',
        ).toUpperCase();
        if (EGG_CATEGORIES.has(category)) {
          await this.deductEggFifo(tx, farmId, item);
        }
      }

      if (item.livestockId) {
        await tx.livestock.update({
          where: { id: item.livestockId },
          data: { currentCount: { decrement: item.quantity } },
        });
      }
    }
  }

  /**
   * FIFO deduction from egg production logs (oldest first).
   * Creates OrderItemBatchAllocation records for traceability.
   */
  private async deductEggFifo(tx: any, farmId: string, item: any) {
    let remaining = item.quantity;

    const batchFilter =
      item.eggAllocationMode === 'batch' && item.eggBatchId
        ? { batchId: item.eggBatchId }
        : {};

    const productions = await tx.eggProduction.findMany({
      where: {
        farmId,
        isDeleted: false,
        eggsRemaining: { gt: 0 },
        ...batchFilter,
        batch: {
          status: { equals: 'active', mode: 'insensitive' },
          type: 'POULTRY_LAYER',
          isDeleted: false,
        },
      },
      orderBy: { logDate: 'asc' },
    });

    for (const prod of productions) {
      if (remaining <= 0) break;
      const available = Number(prod.eggsRemaining);
      const deduct = Math.min(available, remaining);

      await tx.eggProduction.update({
        where: { id: prod.id },
        data: { eggsRemaining: { decrement: deduct } },
      });

      const unitRevenue = Number(item.totalPrice) / item.quantity;
      await tx.orderItemBatchAllocation.create({
        data: {
          orderItemId: item.id,
          batchId: prod.batchId,
          farmId,
          eggsUsed: deduct,
          revenueAmount: toMoney(deduct * unitRevenue),
        },
      });

      remaining -= deduct;
    }
  }

  /**
   * Reverse inventory/egg deductions when moving away from COMPLETED status.
   */
  private async reverseCompletion(tx: any, farmId: string, order: any) {
    for (const item of order.items ?? []) {
      if (item.inventoryId) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { stockLevel: { increment: item.quantity } },
        });

        const category = String(
          item.inventory?.category || '',
        ).toUpperCase();
        if (EGG_CATEGORIES.has(category)) {
          let qtyToRestore = item.quantity;
          const productions = await tx.eggProduction.findMany({
            where: { farmId },
            orderBy: { logDate: 'desc' },
          });
          for (const prod of productions) {
            if (qtyToRestore <= 0) break;
            const maxHold = prod.eggsCollected - prod.unusableCount;
            const canAdd = maxHold - prod.eggsRemaining;
            if (canAdd <= 0) continue;
            const add = Math.min(canAdd, qtyToRestore);
            await tx.eggProduction.update({
              where: { id: prod.id },
              data: { eggsRemaining: { increment: add } },
            });
            qtyToRestore -= add;
          }
        }
      }

      if (item.livestockId) {
        await tx.livestock.update({
          where: { id: item.livestockId },
          data: { currentCount: { increment: item.quantity } },
        });
      }
    }
  }
}
