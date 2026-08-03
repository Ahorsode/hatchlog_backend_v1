import { Injectable } from '@nestjs/common';
import { HealthEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asNumber,
  asString,
  EntityHandler,
  EntityHandlerContext,
  MutationResult,
  parseDate,
  requiredString,
  SyncMutationInput,
} from './handler.types';

@Injectable()
export class MortalityHandler implements EntityHandler {
  readonly entityType = 'mortality';

  constructor(private readonly prisma: PrismaService) {}

  async apply(
    mutation: SyncMutationInput,
    context: EntityHandlerContext,
  ): Promise<MutationResult> {
    if (mutation.op === 'delete') {
      await this.prisma.healthMortality.updateMany({
        where: { id: mutation.client_id, farmId: context.farmId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      return {
        client_id: mutation.client_id,
        status: 'accepted',
        server_id: mutation.client_id,
      };
    }

    const payload = mutation.payload;
    const batchId = requiredString(payload, 'batch_id');
    const healthType = asString(payload.health_type).toUpperCase();
    const type: HealthEventType =
      healthType === 'SICK' ? HealthEventType.SICK : HealthEventType.DEAD;
    const logDate = parseDate(
      payload.log_date ?? mutation.client_updated_at,
      new Date(),
    );
    const isolationRoomId = asString(payload.isolation_room_id) || null;

    await this.prisma.healthMortality.upsert({
      where: { id: mutation.client_id },
      create: {
        id: mutation.client_id,
        batchId,
        farmId: context.farmId,
        userId: context.userId,
        count: Math.round(asNumber(payload.count)),
        type,
        reason: asString(payload.reason) || null,
        category: asString(payload.category) || null,
        subCategory: asString(payload.sub_category) || null,
        isolationRoomId,
        logDate,
        isDeleted: false,
        deletedAt: null,
      },
      update: {
        batchId,
        farmId: context.farmId,
        userId: context.userId,
        count: Math.round(asNumber(payload.count)),
        type,
        reason: asString(payload.reason) || null,
        category: asString(payload.category) || null,
        subCategory: asString(payload.sub_category) || null,
        isolationRoomId,
        logDate,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return {
      client_id: mutation.client_id,
      status: 'accepted',
      server_id: mutation.client_id,
    };
  }
}
