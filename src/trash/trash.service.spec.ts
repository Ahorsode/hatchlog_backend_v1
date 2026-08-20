import { TrashService } from './trash.service';
import type { AuthUser } from '../auth/auth.types';

describe('TrashService.list', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('caps each deleted-table query at 100 rows', async () => {
    const empty = jest.fn().mockResolvedValue([]);
    const prisma = {
      livestock: { findMany: empty },
      feedingLog: { findMany: empty },
      eggProduction: { findMany: empty },
      healthMortality: { findMany: empty },
      expense: { findMany: empty },
      sale: { findMany: empty },
      order: { findMany: empty },
      inventory: { findMany: empty },
    };
    const service = new TrashService(prisma as any);

    await service.list(user, farmId);

    for (const model of Object.values(prisma)) {
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    }
  });
});
