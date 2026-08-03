import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  BatchAnalyticsQueryDto,
  MortalityTrendsQueryDto,
} from '../common/dto/domain.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('batch')
  @RequireFarmPermission('batches', 'view')
  @ApiOkResponse({ description: 'Batch analytics (FCR, feed, weight, mortality)' })
  batchAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: BatchAnalyticsQueryDto,
  ) {
    return this.service.getBatchAnalytics(user, query);
  }

  @Get('mortality-trends')
  @RequireFarmPermission('batches', 'view')
  @ApiOkResponse({ description: 'Daily mortality trends' })
  mortalityTrends(
    @CurrentUser() user: AuthUser,
    @Query() query: MortalityTrendsQueryDto,
  ) {
    return this.service.getMortalityTrends(user, query.farm_id);
  }
}
