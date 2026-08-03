import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import type {
  CreateLedgerTransactionDto,
  DeleteLedgerTransactionDto,
  SettleLedgerTransactionDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FEED: 'Feed Purchases',
  MEDICATION: 'Flock Vaccines & Medication',
  EQUIPMENT: 'Equipment & Maintenance',
  UTILITIES: 'Utilities',
  SALARY: 'Labor & Salaries',
  MAINTENANCE: 'Equipment & Maintenance',
  OTHER: 'Other OpEx',
  LIVESTOCK_PURCHASE: 'Day-Old Chicks Purchase',
  TRANSPORT: 'Transport',
};

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const [transactions, expenses] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: { farmId, isDeleted: false, deletedAt: null },
        include: {
          user: { select: { firstname: true, surname: true, role: true } },
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: { farmId, isDeleted: false },
        include: {
          user: { select: { firstname: true, surname: true, role: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const ledgerRows = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      depositAmount: Number(t.depositAmount),
      outstandingCredit: Number(t.outstandingCredit),
      source: 'LEDGER' as const,
    }));

    const expenseRows = expenses.map((e) => ({
      id: e.id,
      type: 'EXPENSE' as const,
      category:
        EXPENSE_CATEGORY_LABELS[e.category] || e.category || 'Other OpEx',
      amount: Number(e.amount),
      paymentStatus: 'PAID',
      paymentMethod: 'Operational',
      referenceNum: null,
      transactionDate: e.expenseDate,
      description: e.description,
      user: e.user,
      source: 'EXPENSE' as const,
    }));

    return [...ledgerRows, ...expenseRows].sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() -
        new Date(a.transactionDate).getTime(),
    );
  }

  async create(user: AuthUser, dto: CreateLedgerTransactionDto) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const transactionDate = dto.transactionDate
      ? requireDate(dto.transactionDate, 'transactionDate')
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          farmId,
          userId: user.id,
          type: dto.type,
          category: dto.category,
          amount: parseFloat(String(dto.amount)),
          paymentStatus: dto.paymentStatus,
          paymentMethod: dto.paymentMethod,
          referenceNum: dto.referenceNum || null,
          transactionDate,
          description: dto.description || null,
          isDeleted: false,
          deletedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'financial_transactions',
          recordId: transaction.id,
          attributeName: 'all',
          newValue: JSON.stringify({
            ...transaction,
            amount: Number(transaction.amount),
          }),
          actionType: 'FINANCIAL_TRANSACTION_CREATED',
          description: `Logged ${dto.type.toLowerCase()} of ${dto.amount} under ${dto.category}`,
          userId: user.id,
          farmId,
        },
      });

      return {
        success: true,
        transaction: { ...transaction, amount: Number(transaction.amount) },
      };
    });
  }

  async settle(
    user: AuthUser,
    id: string,
    dto: SettleLedgerTransactionDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.financialTransaction.findFirst({
        where: { id, farmId },
      });
      if (!existing) throw new NotFoundException('Transaction not found');

      const baseDesc = existing.description || '';
      const settledSuffix = `Fully settled on ${new Date().toLocaleDateString()}${dto.referenceNum ? ` (ref: ${dto.referenceNum})` : ''}`;
      const updatedDesc = baseDesc
        ? `${baseDesc} | ${settledSuffix}`
        : settledSuffix;

      const transaction = await tx.financialTransaction.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          referenceNum: dto.referenceNum || existing.referenceNum,
          description: updatedDesc,
          settledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'financial_transactions',
          recordId: id,
          attributeName: 'paymentStatus',
          oldValue: existing.paymentStatus,
          newValue: 'PAID',
          actionType: 'FINANCIAL_TRANSACTION_SETTLED',
          description: `Settled outstanding transaction #${id} of ${existing.amount}`,
          userId: user.id,
          farmId,
        },
      });

      return { success: true };
    });
  }

  async remove(
    user: AuthUser,
    id: string,
    dto: DeleteLedgerTransactionDto,
  ) {
    assertFarmAccess(user, dto.farm_id);
    const farmId = dto.farm_id;

    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException(
        'A valid reason (minimum 5 characters) is required for deletion',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.financialTransaction.findFirst({
        where: { id, farmId },
      });
      if (!existing) throw new NotFoundException('Transaction not found');

      await tx.deleteLog.create({
        data: {
          userId: user.id,
          farmId,
          tableName: 'financial_transactions',
          deletedDataCsv: JSON.stringify(existing),
          reason: dto.reason.trim(),
        },
      });

      await tx.financialTransaction.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'financial_transactions',
          recordId: id,
          attributeName: 'isDeleted',
          oldValue: 'false',
          newValue: 'true',
          actionType: 'FINANCIAL_TRANSACTION_DELETED',
          description: `Deleted financial transaction #${id}. Reason: ${dto.reason}`,
          userId: user.id,
          farmId,
        },
      });

      return { success: true };
    });
  }
}
