import { LedgerService } from './ledger.service';
import type { AuthUser } from '../auth/auth.types';

describe('LedgerService.list', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('caps ledger and expense queries and returns at most take rows', async () => {
    const prisma = {
      financialTransaction: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 't1',
            amount: 10,
            depositAmount: 0,
            outstandingCredit: 0,
            transactionDate: new Date('2026-08-02'),
            user: null,
          },
        ]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'e1',
            amount: 5,
            category: 'FEED',
            description: 'Feed',
            expenseDate: new Date('2026-08-01'),
            user: null,
          },
        ]),
      },
    };
    const service = new LedgerService(prisma as any);

    const rows = await service.list(user, { farm_id: farmId, limit: 100 });

    expect(prisma.financialTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(rows).toHaveLength(2);
  });

  it('clamps take between 1 and 500', async () => {
    const prisma = {
      financialTransaction: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new LedgerService(prisma as any);

    await service.list(user, { farm_id: farmId, limit: 9999 });

    expect(prisma.financialTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 }),
    );
  });
});
