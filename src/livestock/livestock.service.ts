import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LivestockType } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import {
  CreateLivestockDto,
  CreateWeightRecordDto,
  ListQueryDto,
  SoftDeleteDto,
  UpdateLivestockDto,
} from '../common/dto/domain.dto';
import { assertFarmAccess, requireDate } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

const LIVESTOCK_TYPES = new Set<string>(Object.values(LivestockType));

@Injectable()
export class LivestockService {
  constructor(private readonly prisma: PrismaService) {}

  private parseType(value?: string): LivestockType {
    if (!value) return LivestockType.POULTRY_BROILER;
    if (!LIVESTOCK_TYPES.has(value)) {
      throw new BadRequestException(`Invalid livestock type: ${value}`);
    }
    return value as LivestockType;
  }

  async list(user: AuthUser, query: ListQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);
    return this.prisma.livestock.findMany({
      where: {
        farmId: query.farm_id,
        isDeleted: false,
        ...(query.house_id ? { houseId: query.house_id } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: this.parseType(query.type) } : {}),
      },
      include: { house: true },
      orderBy: { arrivalDate: 'desc' },
      take,
    });
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const batch = await this.prisma.livestock.findFirst({
      where: { id, farmId, isDeleted: false },
      include: { house: true },
    });
    if (!batch) throw new NotFoundException('Livestock batch not found');
    return batch;
  }

  async create(user: AuthUser, dto: CreateLivestockDto) {
    assertFarmAccess(user, dto.farm_id);

    const house = await this.prisma.house.findFirst({
      where: { id: dto.houseId, farmId: dto.farm_id },
      select: { id: true },
    });
    if (!house) throw new BadRequestException('House not found on this farm');

    return this.prisma.livestock.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        houseId: dto.houseId,
        farmId: dto.farm_id,
        breedType: dto.breedType,
        type: this.parseType(dto.type),
        batchName: dto.batchName || `Unit ${Date.now()}`,
        initialCount: dto.initialCount,
        currentCount: dto.initialCount,
        arrivalDate: requireDate(dto.arrivalDate, 'arrivalDate'),
        status: 'active',
        userId: user.id,
      },
      include: { house: true },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateLivestockDto) {
    const existing = await this.prisma.livestock.findUnique({
      where: { id },
      select: {
        id: true,
        farmId: true,
        initialCount: true,
        currentCount: true,
        isDeleted: true,
      },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Livestock batch not found');
    }
    assertFarmAccess(user, existing.farmId);

    if (dto.houseId) {
      const house = await this.prisma.house.findFirst({
        where: { id: dto.houseId, farmId: existing.farmId },
        select: { id: true },
      });
      if (!house) throw new BadRequestException('House not found on this farm');
    }

    const updateData: Record<string, unknown> = {
      ...(dto.houseId !== undefined ? { houseId: dto.houseId } : {}),
      ...(dto.breedType !== undefined ? { breedType: dto.breedType } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.batchName !== undefined ? { batchName: dto.batchName } : {}),
      ...(dto.growthTargetOverride !== undefined
        ? { growthTargetOverride: dto.growthTargetOverride }
        : {}),
      ...(dto.type !== undefined ? { type: this.parseType(dto.type) } : {}),
      ...(dto.arrivalDate !== undefined
        ? { arrivalDate: requireDate(dto.arrivalDate, 'arrivalDate') }
        : {}),
      ...(dto.currentCount !== undefined
        ? { currentCount: dto.currentCount }
        : {}),
    };

    if (
      dto.initialCount !== undefined &&
      dto.initialCount !== existing.initialCount
    ) {
      const diff = dto.initialCount - existing.initialCount;
      updateData.initialCount = dto.initialCount;
      if (dto.currentCount === undefined) {
        updateData.currentCount = (existing.currentCount || 0) + diff;
      }
    }

    return this.prisma.livestock.update({
      where: { id },
      data: updateData,
      include: { house: true },
    });
  }

  async remove(user: AuthUser, id: string, dto: SoftDeleteDto) {
    const reason = dto.reason?.trim() ?? '';
    if (reason.length < 5) {
      throw new BadRequestException(
        'A valid reason is required for deletion (min 5 characters)',
      );
    }

    const existing = await this.prisma.livestock.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Livestock batch not found');
    }
    assertFarmAccess(user, existing.farmId);

    await this.prisma.$transaction([
      this.prisma.deleteLog.create({
        data: {
          userId: user.id,
          farmId: existing.farmId,
          tableName: 'livestock',
          deletedDataCsv: JSON.stringify(existing),
          reason,
        },
      }),
      this.prisma.livestock.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const existing = await this.prisma.livestock.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Livestock batch not found');

    return this.prisma.livestock.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: { house: true },
    });
  }

  async getDetails(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);
    const batch = await this.prisma.livestock.findFirst({
      where: { id, farmId, isDeleted: false },
      include: {
        house: true,
        weightRecords: { orderBy: { logDate: 'desc' }, take: 50 },
        feedingLogs: {
          where: { isDeleted: false },
          orderBy: { logDate: 'desc' },
          take: 50,
          include: {
            inventory: { select: { id: true, itemName: true } },
            formulation: { select: { id: true, name: true } },
          },
        },
        eggProduction: {
          where: { isDeleted: false },
          orderBy: { logDate: 'desc' },
          take: 50,
        },
        mortalityRecords: {
          where: { isDeleted: false },
          orderBy: { logDate: 'desc' },
          take: 50,
        },
        vaccinations: { orderBy: { scheduledDate: 'asc' }, take: 50 },
        medications: { orderBy: { scheduledDate: 'asc' }, take: 50 },
      },
    });
    if (!batch) throw new NotFoundException('Livestock batch not found');
    return batch;
  }

  async addWeight(
    user: AuthUser,
    batchId: string,
    dto: CreateWeightRecordDto,
  ) {
    assertFarmAccess(user, dto.farm_id);

    const batch = await this.prisma.livestock.findFirst({
      where: { id: batchId, farmId: dto.farm_id, isDeleted: false },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Livestock batch not found');

    return this.prisma.weightRecord.create({
      data: {
        batchId,
        farmId: dto.farm_id,
        averageWeight: dto.averageWeight,
        logDate: requireDate(dto.logDate, 'logDate'),
        userId: user.id,
      },
    });
  }
}
