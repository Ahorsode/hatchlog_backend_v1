import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type { RecordPaymentDto } from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const MONEY_EPSILON = 0.01;

function toMoney(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(user: AuthUser, dto: RecordPaymentDto) {
    assertFarmAccess(user, dto.farm_id);

    const amount = toMoney(Number(dto.amount));
    if (amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();

    await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, farmId: dto.farm_id },
        select: { balanceOwed: true },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const currentBalance = Number(customer.balanceOwed);
      if (amount - currentBalance > MONEY_EPSILON) {
        throw new BadRequestException(
          'Payment amount exceeds customer balance',
        );
      }

      await tx.customer.update({
        where: { id: dto.customerId },
        data: { balanceOwed: { decrement: amount } },
      });

      if (dto.orderId) {
        const order = await tx.order.findFirst({
          where: { id: dto.orderId, farmId: dto.farm_id, isDeleted: false },
          include: { items: true },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        const previousCash = toMoney(Number(order.cashReceived || 0));
        const nextCash = toMoney(previousCash + amount);
        const totalAmount = toMoney(Number(order.totalAmount));
        const isPaid = nextCash + MONEY_EPSILON >= totalAmount;

        await tx.order.update({
          where: { id: order.id },
          data: {
            cashReceived: nextCash,
            status: isPaid ? 'PAID' : order.status,
            ...(isPaid ? { paidAt: paymentDate } : {}),
          },
        });

        const itemSummary = order.items
          .map((item) => `${item.quantity} x ${item.description}`)
          .join(', ');

        await tx.financialTransaction.upsert({
          where: { orderId: order.id },
          create: {
            farmId: dto.farm_id,
            userId: user.id,
            orderId: order.id,
            customerId: order.customerId,
            type: 'INCOME',
            category: 'SALE',
            amount: totalAmount,
            depositAmount: nextCash,
            outstandingCredit: toMoney(Math.max(totalAmount - nextCash, 0)),
            paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
            paymentMethod: dto.paymentMethod || order.paymentMethod || 'CASH',
            referenceNum: order.paymentReference,
            transactionDate: paymentDate,
            description: itemSummary || 'Farm-gate sale',
          },
          update: {
            depositAmount: nextCash,
            outstandingCredit: toMoney(Math.max(totalAmount - nextCash, 0)),
            paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
            paymentMethod: dto.paymentMethod || order.paymentMethod || 'CASH',
            transactionDate: paymentDate,
          },
        });
      }
    });

    return { success: true, message: 'Payment recorded successfully' };
  }
}
