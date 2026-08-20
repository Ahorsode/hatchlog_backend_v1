import {
  hasEntitlement,
  resolveFarmAccess,
  trialCreateData,
} from './farm-access-status';

describe('resolveFarmAccess', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  it('treats an in-window CLOUD_TRIAL farm as STANDARD trial', () => {
    const access = resolveFarmAccess(
      {
        subscriptionTier: 'STANDARD',
        masterLicenseStatus: 'CLOUD_TRIAL',
        trialStartedAt: new Date('2026-08-01T12:00:00.000Z'),
        trialExpiresAt: new Date('2026-08-31T12:00:00.000Z'),
      },
      now,
    );

    expect(access.status).toBe('trial');
    expect(access.tier).toBe('STANDARD');
    expect(access.remainingDays).toBe(11);
    expect(hasEntitlement(access, 'CRM')).toBe(false);
    expect(hasEntitlement(access, 'advanced-finance')).toBe(true);
  });

  it('locks unpaid farms after trialExpiresAt', () => {
    const access = resolveFarmAccess(
      {
        subscriptionTier: 'STANDARD',
        masterLicenseStatus: 'CLOUD_TRIAL',
        trialExpiresAt: new Date('2026-08-19T12:00:00.000Z'),
      },
      now,
    );

    expect(access.status).toBe('locked');
    expect(access.remainingDays).toBe(0);
    expect(access.entitlements).toEqual([]);
  });

  it('unlocks paid premium farms and grants CRM', () => {
    const access = resolveFarmAccess(
      {
        subscriptionTier: 'PREMIUM',
        masterLicenseStatus: 'PAID_PREMIUM',
        trialExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      },
      now,
    );

    expect(access.status).toBe('paid');
    expect(hasEntitlement(access, 'CRM')).toBe(true);
  });

  it('builds a 30-day STANDARD trial payload', () => {
    const fields = trialCreateData(now);
    expect(fields.subscriptionTier).toBe('STANDARD');
    expect(fields.masterLicenseStatus).toBe('CLOUD_TRIAL');
    expect(
      (fields.trialExpiresAt.getTime() - fields.trialStartedAt.getTime()) /
        (24 * 60 * 60 * 1000),
    ).toBe(30);
  });

  it('denies CRM on paid Standard', () => {
    const access = resolveFarmAccess(
      {
        subscriptionTier: 'STANDARD',
        masterLicenseStatus: 'PAID_STANDARD',
        trialExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
      },
      now,
    );

    expect(access.status).toBe('paid');
    expect(hasEntitlement(access, 'CRM')).toBe(false);
  });

  it('treats PAID_AND_ACTIVE as paid and unlocked', () => {
    const access = resolveFarmAccess(
      {
        subscriptionTier: 'PREMIUM',
        masterLicenseStatus: 'PAID_AND_ACTIVE',
        trialExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
      },
      now,
    );

    expect(access.status).toBe('paid');
    expect(hasEntitlement(access, 'CRM')).toBe(true);
  });
});
