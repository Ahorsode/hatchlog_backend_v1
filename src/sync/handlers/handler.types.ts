export type MutationResultStatus = 'accepted' | 'conflict' | 'rejected';

export type MutationResult = {
  client_id: string;
  status: MutationResultStatus;
  server_id?: string;
  error_code?: string;
  message?: string;
};

export type SyncMutationInput = {
  client_id: string;
  entity_type: string;
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  client_updated_at?: string;
};

export type EntityHandlerContext = {
  userId: string;
  farmId: string;
};

export interface EntityHandler {
  readonly entityType: string;
  apply(
    mutation: SyncMutationInput,
    context: EntityHandlerContext,
  ): Promise<MutationResult>;
}

export function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value).trim();
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export function requiredString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = asString(payload[key]);
  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value;
}

export function parseDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}
