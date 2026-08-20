import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import {
  SyncPullQueryDto,
  SyncPushDto,
  SyncStatusQueryDto,
} from './dto/sync.dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('api/v1/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @ApiOkResponse({ description: 'Apply batched offline mutations' })
  push(@CurrentUser() user: AuthUser, @Body() body: SyncPushDto) {
    return this.syncService.push(user, body);
  }

  @Get('pull')
  @ApiOkResponse({ description: 'Pull farm delta since cursor' })
  pull(@CurrentUser() user: AuthUser, @Query() query: SyncPullQueryDto) {
    const limit =
      typeof query.limit === 'string'
        ? Number(query.limit)
        : (query.limit ?? 200);
    return this.syncService.pull(user, query.farm_id, query.since, limit);
  }

  @Get('status')
  @ApiOkResponse({ description: 'Sync status for farm' })
  status(@CurrentUser() user: AuthUser, @Query() query: SyncStatusQueryDto) {
    return this.syncService.status(user, query.farm_id);
  }
}
