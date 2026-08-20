export const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PAID_MASTER_STATUSES = [
  'PAID_STANDARD',
  'PAID_PREMIUM',
  'PAID_AND_ACTIVE',
  'ACTIVE',
  'PAID',
] as const;

export type FarmAccessState = 'trial' | 'paid' | 'locked';
export type FarmEntitlement =
  | 'PDF_INVOICES'
  | 'CRM'
  | 'ADVANCED_ACCOUNTING'
  | 'ANALYTICS_BENCHMARKING'
  | 'MULTI_CURRENCY'
  | 'WORKER_LIMIT'
  | 'multi-livestock'
  | 'marketing'
  | 'feed-formulation'
  | 'advanced-finance';

export type FarmAccessSnapshot = {
  status: FarmAccessState;
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  remainingDays: number;
  periodEndsAt: string | null;
  trialStartedAt: string | null;
  entitlements: FarmEntitlement[];
};

type FarmAccessInput = {
  subscriptionTier: string;
  masterLicenseStatus?: string | null;
  trialStartedAt?: Date | null;
  trialExpiresAt?: Date | null;
};

const TIER_ENTITLEMENTS: Record<FarmAccessSnapshot['tier'], FarmEntitlement[]> =
  {
    BASIC: ['PDF_INVOICES'],
    STANDARD: [
      'PDF_INVOICES',
      'WORKER_LIMIT',
      'multi-livestock',
      'advanced-finance',
    ],
    PREMIUM: [
      'PDF_INVOICES',
      'CRM',
      'ADVANCED_ACCOUNTING',
      'ANALYTICS_BENCHMARKING',
      'MULTI_CURRENCY',
      'WORKER_LIMIT',
      'multi-livestock',
      'advanced-finance',
      'marketing',
      'feed-formulation',
    ],
  };

export function isPaidMasterStatus(status: string | null | undefined) {
  return PAID_MASTER_STATUSES.includes(
    (status ?? '').toUpperCase() as (typeof PAID_MASTER_STATUSES)[number],
  );
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function trialCreateData(now = new Date()) {
  return {
    subscriptionTier: 'STANDARD' as const,
    masterLicenseStatus: 'CLOUD_TRIAL',
    trialStartedAt: now,
    trialExpiresAt: addDays(now, TRIAL_DAYS),
    trialExhaustedAt: null as Date | null,
  };
}

export function normalizeTier(
  tier: string | null | undefined,
): FarmAccessSnapshot['tier'] {
  const value = (tier ?? 'BASIC').toUpperCase();
  if (value === 'STANDARD' || value === 'PREMIUM') return value;
  return 'BASIC';
}

export function resolveFarmAccess(
  farm: FarmAccessInput,
  now = new Date(),
): FarmAccessSnapshot {
  const master = (farm.masterLicenseStatus ?? '').toUpperCase();
  const periodEndsAt = farm.trialExpiresAt ?? null;
  const remainingDays = periodEndsAt
    ? Math.max(0, Math.ceil((periodEndsAt.getTime() - now.getTime()) / DAY_MS))
    : 0;

  if (isPaidMasterStatus(master)) {
    const tier = normalizeTier(farm.subscriptionTier);
    return {
      status: 'paid',
      tier,
      remainingDays,
      periodEndsAt: periodEndsAt?.toISOString() ?? null,
      trialStartedAt: farm.trialStartedAt?.toISOString() ?? null,
      entitlements: TIER_ENTITLEMENTS[tier],
    };
  }

  const trialActive =
    master !== 'REVOKED' &&
    periodEndsAt != null &&
    periodEndsAt.getTime() > now.getTime();

  if (trialActive) {
    return {
      status: 'trial',
      tier: 'STANDARD',
      remainingDays,
      periodEndsAt: periodEndsAt.toISOString(),
      trialStartedAt: farm.trialStartedAt?.toISOString() ?? null,
      entitlements: TIER_ENTITLEMENTS.STANDARD,
    };
  }

  const lockedTier = normalizeTier(farm.subscriptionTier);
  return {
    status: 'locked',
    tier: lockedTier,
    remainingDays: 0,
    periodEndsAt: periodEndsAt?.toISOString() ?? null,
    trialStartedAt: farm.trialStartedAt?.toISOString() ?? null,
    entitlements: [],
  };
}

export function hasEntitlement(
  snapshot: FarmAccessSnapshot,
  entitlement: FarmEntitlement,
) {
  return (
    snapshot.status !== 'locked' && snapshot.entitlements.includes(entitlement)
  );
}
