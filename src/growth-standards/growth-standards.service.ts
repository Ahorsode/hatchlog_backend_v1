import { Injectable } from '@nestjs/common';
import type { LivestockType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GrowthStandardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type?: string) {
    const where =
      type && type.trim()
        ? { livestockType: type.trim().toUpperCase() as LivestockType }
        : {};

    const rows = await this.prisma.growthStandards.findMany({
      where,
      orderBy: [{ livestockType: 'asc' }, { ageInDays: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: `${this.humanize(row.livestockType)} @ day ${row.ageInDays}`,
      livestockType: row.livestockType,
      ageInDays: row.ageInDays,
      targetWeight: Number(row.targetWeight),
      targetFeed:
        row.targetFeed === null || row.targetFeed === undefined
          ? null
          : Number(row.targetFeed),
      unit: row.unit,
      createdAt: row.createdAt,
    }));
  }

  private humanize(type: string) {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
