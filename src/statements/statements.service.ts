import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerStatement(
    user: AuthUser,
    customerId: string,
    farmId: string,
  ) {
    assertFarmAccess(user, farmId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, farmId },
      include: {
        orders: {
          where: { isDeleted: false },
          include: { items: true },
          orderBy: { orderDate: 'desc' },
          take: 200,
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return {
      ...customer,
      balanceOwed: Number(customer.balanceOwed),
      orders: customer.orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        discountAmount: Number(o.discountAmount),
        subtotalAmount: Number(o.subtotalAmount),
        taxAmount: Number(o.taxAmount),
        cashReceived: Number(o.cashReceived),
        items: o.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          lineDiscountAmount: Number(item.lineDiscountAmount),
        })),
      })),
    };
  }

  async getSupplierStatement(
    user: AuthUser,
    supplierId: string,
    farmId: string,
  ) {
    assertFarmAccess(user, farmId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, farmId },
      include: {
        inventory: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          take: 200,
        },
      },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');

    return {
      ...supplier,
      balanceOwed: Number(supplier.balanceOwed),
      inventory: supplier.inventory.map((item) => ({
        ...item,
        stockLevel: Number(item.stockLevel),
        costPerUnit: Number(item.costPerUnit || 0),
      })),
      expenses: supplier.expenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
      })),
    };
  }
}
