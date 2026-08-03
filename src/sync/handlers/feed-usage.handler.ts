import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asNumber,
  asString,
  EntityHandler,
  EntityHandlerContext,
  MutationResult,
  parseDate,
  SyncMutationInput,
} from './handler.types';

@Injectable()
export class FeedUsageHandler implements EntityHandler {
  readonly entityType = 'feed_usage';

  constructor(private readonly prisma: PrismaService) {}

  async apply(
    mutation: SyncMutationInput,
    context: EntityHandlerContext,
  ): Promise<MutationResult> {
    if (mutation.op === 'delete') {
      await this.prisma.feedingLog.updateMany({
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
    const batchId = asString(payload.batch_id) || null;
    const feedTypeId = asString(payload.feed_type_id) || null;
    const formulationId = asString(payload.formulation_id) || null;
    const amountConsumed = asNumber(
      payload.amount_consumed ?? payload.bags,
    );
    const logDate = parseDate(
      payload.log_date ?? mutation.client_updated_at,
      new Date(),
    );

    await this.prisma.feedingLog.upsert({
      where: { id: mutation.client_id },
      create: {
        id: mutation.client_id,
        batchId,
        feedTypeId,
        formulationId,
        amountConsumed,
        logDate,
        farmId: context.farmId,
        userId: context.userId,
        isDeleted: false,
        deletedAt: null,
      },
      update: {
        batchId,
        feedTypeId,
        formulationId,
        amountConsumed,
        logDate,
        farmId: context.farmId,
        userId: context.userId,
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
