import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SYNC_REPAIR_QUEUE } from '../workers/queue.constants';
import { EggCollectionHandler } from './handlers/egg-collection.handler';
import { FeedUsageHandler } from './handlers/feed-usage.handler';
import { MortalityHandler } from './handlers/mortality.handler';
import type {
  EntityHandler,
  MutationResult,
  SyncMutationInput,
} from './handlers/handler.types';
import type { SyncPushDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly handlers: Map<string, EntityHandler>;

  constructor(
    private readonly prisma: PrismaService,
    eggCollectionHandler: EggCollectionHandler,
    feedUsageHandler: FeedUsageHandler,
    mortalityHandler: MortalityHandler,
    @InjectQueue(SYNC_REPAIR_QUEUE) private readonly syncRepairQueue: Queue,
  ) {
    this.handlers = new Map(
      [eggCollectionHandler, feedUsageHandler, mortalityHandler].map(
        (handler) => [handler.entityType, handler],
      ),
    );
  }

  assertFarmAccess(user: AuthUser, farmId: string): void {
    if (!user.farmIds.includes(farmId)) {
      throw new ForbiddenException('Farm is not accessible for this user');
    }
  }

  async push(user: AuthUser, body: SyncPushDto) {
    this.assertFarmAccess(user, body.farm_id);

    if (body.sync_protocol_version !== 1) {
      return {
        sync_protocol_version: 1,
        results: body.mutations.map((mutation) => ({
          client_id: mutation.client_id,
          status: 'rejected' as const,
          error_code: 'UNSUPPORTED_PROTOCOL',
          message: `Unsupported sync_protocol_version: ${body.sync_protocol_version}`,
        })),
      };
    }

    const results: MutationResult[] = [];
    for (const mutation of body.mutations) {
      results.push(await this.applyMutation(user, body.farm_id, mutation));
    }

    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length > 0) {
      await this.syncRepairQueue.add(
        'review-rejected',
        {
          farmId: body.farm_id,
          userId: user.id,
          rejectedCount: rejected.length,
        },
        { removeOnComplete: true, attempts: 1 },
      );
    }

    return {
      sync_protocol_version: 1,
      results,
    };
  }

  private async applyMutation(
    user: AuthUser,
    farmId: string,
    mutation: SyncMutationInput,
  ): Promise<MutationResult> {
    const handler = this.handlers.get(mutation.entity_type);
    if (!handler) {
      return {
        client_id: mutation.client_id,
        status: 'rejected',
        error_code: 'UNSUPPORTED_ENTITY',
        message: `Unsupported entity_type: ${mutation.entity_type}`,
      };
    }

    try {
      return await handler.apply(mutation, { userId: user.id, farmId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown mutation error';
      this.logger.warn(
        `Mutation rejected for ${mutation.client_id}: ${message}`,
      );
      return {
        client_id: mutation.client_id,
        status: 'rejected',
        error_code: 'MUTATION_FAILED',
        message,
      };
    }
  }

  async pull(user: AuthUser, farmId: string, since?: string, limit = 200) {
    this.assertFarmAccess(user, farmId);
    const take = Math.min(Math.max(limit || 200, 1), 500);
    const sinceDate = since ? new Date(since) : null;
    const sinceFilter = sinceDate ? { gte: sinceDate } : undefined;

    const [eggs, feeds, mortalities] = await Promise.all([
      this.prisma.eggProduction.findMany({
        where: {
          farmId,
          ...(sinceFilter ? { createdAt: sinceFilter } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take,
      }),
      this.prisma.feedingLog.findMany({
        where: {
          farmId,
          ...(sinceFilter ? { logDate: sinceFilter } : {}),
        },
        orderBy: { logDate: 'asc' },
        take,
      }),
      this.prisma.healthMortality.findMany({
        where: {
          farmId,
          ...(sinceFilter ? { createdAt: sinceFilter } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take,
      }),
    ]);

    const records = [
      ...eggs.map((row) => ({
        entity_type: 'egg_collection',
        server_id: row.id,
        updated_at: row.createdAt.toISOString(),
        payload: row,
      })),
      ...feeds.map((row) => ({
        entity_type: 'feed_usage',
        server_id: row.id,
        updated_at: row.logDate.toISOString(),
        payload: row,
      })),
      ...mortalities.map((row) => ({
        entity_type: 'mortality',
        server_id: row.id,
        updated_at: row.createdAt.toISOString(),
        payload: row,
      })),
    ].sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    const sliced = records.slice(0, take);
    const nextCursor =
      sliced.length > 0
        ? sliced[sliced.length - 1].updated_at
        : (since ?? null);

    return {
      sync_protocol_version: 1,
      farm_id: farmId,
      records: sliced,
      next_cursor: nextCursor,
      has_more: records.length > take,
    };
  }

  async status(user: AuthUser, farmId: string) {
    this.assertFarmAccess(user, farmId);

    const [eggCount, feedCount, mortalityCount] = await Promise.all([
      this.prisma.eggProduction.count({
        where: { farmId, isDeleted: false },
      }),
      this.prisma.feedingLog.count({
        where: { farmId, isDeleted: false },
      }),
      this.prisma.healthMortality.count({
        where: { farmId, isDeleted: false },
      }),
    ]);

    return {
      farm_id: farmId,
      user_id: user.id,
      supported_entities: [...this.handlers.keys()],
      pending_conflicts: 0,
      entity_counts: {
        egg_collection: eggCount,
        feed_usage: feedCount,
        mortality: mortalityCount,
      },
      checked_at: new Date().toISOString(),
    };
  }
}
