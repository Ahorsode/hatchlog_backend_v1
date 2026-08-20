import { AuthContextCache } from './auth-context.cache';
import type { AuthUser } from './auth.types';

describe('AuthContextCache', () => {
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: ['farm_1'],
    supabaseSub: 'sub_1',
  };

  it('returns cached auth users and me profiles until invalidate', () => {
    const cache = new AuthContextCache();
    cache.setAuthUser('jwt:sub_1', user);
    cache.setMeProfile(user.id, { id: user.id, role: 'OWNER' });

    expect(cache.getAuthUser('jwt:sub_1')?.id).toBe('user_1');
    expect(cache.getMeProfile<{ id: string }>(user.id)?.id).toBe('user_1');

    cache.invalidateUser('user_1');
    expect(cache.getAuthUser('jwt:sub_1')).toBeUndefined();
    expect(cache.getMeProfile(user.id)).toBeUndefined();
  });

  it('does not treat unknown keys as authorized users', () => {
    const cache = new AuthContextCache();
    expect(cache.getAuthUser('jwt:unknown-sub')).toBeUndefined();
    expect(cache.getAuthUser('apikey:missing-user')).toBeUndefined();
  });
});
