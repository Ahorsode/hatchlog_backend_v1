import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  asBool,
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
export class EggCollectionHandler implements EntityHandler {
  readonly entityType = 'egg_collection';

  constructor(private readonly prisma: PrismaService) {}

  async apply(
    mutation: SyncMutationInput,
    context: EntityHandlerContext,
  ): Promise<MutationResult> {
    if (mutation.op === 'delete') {
      await this.prisma.eggProduction.updateMany({
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
    const crates = asNumber(payload.crates);
    const singleEggs = asNumber(payload.single_eggs);
    const eggsPerCrate = asNumber(payload.eggs_per_crate, 30);
    const payloadEggs = asNumber(payload.eggs_collected);
    const eggsCollected =
      payloadEggs > 0
        ? Math.round(payloadEggs)
        : Math.round(crates * eggsPerCrate) + Math.round(singleEggs);
    const logDate = parseDate(
      payload.log_date ?? mutation.client_updated_at,
      new Date(),
    );

    const categoryId =
      asString(payload.category_id || payload.categoryId) || null;
    const unusableCount = Math.round(asNumber(payload.unusable_count));
    const eggsRemaining = Math.max(
      eggsCollected - unusableCount,
      asNumber(payload.eggs_remaining, eggsCollected - unusableCount),
    );

    await this.prisma.eggProduction.upsert({
      where: { id: mutation.client_id },
      create: {
        id: mutation.client_id,
        batchId,
        farmId: context.farmId,
        userId: context.userId,
        eggsCollected,
        cratesCollected: crates,
        eggsRemaining,
        categoryId,
        unusableCount,
        qualityGrade: asString(payload.quality_grade) || null,
        isSorted: asBool(payload.is_sorted),
        smallCount: Math.round(asNumber(payload.small_count)),
        mediumCount: Math.round(asNumber(payload.medium_count)),
        largeCount: Math.round(asNumber(payload.large_count)),
        logDate,
        isDeleted: false,
        deletedAt: null,
      },
      update: {
        batchId,
        farmId: context.farmId,
        userId: context.userId,
        eggsCollected,
        cratesCollected: crates,
        eggsRemaining,
        categoryId,
        unusableCount,
        qualityGrade: asString(payload.quality_grade) || null,
        isSorted: asBool(payload.is_sorted),
        smallCount: Math.round(asNumber(payload.small_count)),
        mediumCount: Math.round(asNumber(payload.medium_count)),
        largeCount: Math.round(asNumber(payload.large_count)),
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
