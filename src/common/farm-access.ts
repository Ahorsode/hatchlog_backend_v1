import { ForbiddenException, BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';

export function assertFarmAccess(user: AuthUser, farmId: string): void {
  if (!farmId?.trim()) {
    throw new BadRequestException('farm_id is required');
  }
  if (!user.farmIds.includes(farmId)) {
    throw new ForbiddenException('Farm is not accessible for this user');
  }
}

export function parseOptionalDate(value?: string | Date | null): Date | undefined {
  if (value == null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date: ${String(value)}`);
  }
  return date;
}

export function requireDate(value: string | Date, field = 'date'): Date {
  const date = parseOptionalDate(value);
  if (!date) {
    throw new BadRequestException(`${field} is required`);
  }
  return date;
}
