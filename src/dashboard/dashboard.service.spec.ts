import { DashboardService } from './dashboard.service';
import type { AuthUser } from '../auth/auth.types';

describe('DashboardService.getMonthlySummary', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('returns revenue, expenses, and eggs for the current month', async () => {
    const prisma = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalAmount: 1200 },
        }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 300 },
        }),
      },
      eggProduction: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { eggsCollected: 900 },
        }),
      },
    };
    const service = new DashboardService(prisma as any);

    const summary = await service.getMonthlySummary(user, farmId);

    expect(summary).toEqual({
      revenue: 1200,
      expenses: 300,
      eggs: 900,
    });
    expect(prisma.sale.aggregate).toHaveBeenCalled();
    expect(prisma.expense.aggregate).toHaveBeenCalled();
    expect(prisma.eggProduction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          farmId,
          isDeleted: false,
        }),
      }),
    );
  });

  it('defaults missing aggregates to zero', async () => {
    const prisma = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: null } }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      eggProduction: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { eggsCollected: null } }),
      },
    };
    const service = new DashboardService(prisma as any);

    await expect(service.getMonthlySummary(user, farmId)).resolves.toEqual({
      revenue: 0,
      expenses: 0,
      eggs: 0,
    });
  });
});
