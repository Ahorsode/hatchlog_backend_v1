import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowWhenFarmLocked } from '../common/decorators/allow-when-farm-locked.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import { FarmScopedQueryDto, RequestUpgradeDto } from '../common/dto/domain.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('status')
  @AllowWhenFarmLocked()
  @ApiOkResponse({ description: 'Farm-scoped subscription and trial status' })
  getStatus(
    @CurrentUser() user: AuthUser,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.service.getStatus(user, query.farm_id);
  }

  @Post('request-upgrade')
  @AllowWhenFarmLocked()
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Request a subscription upgrade' })
  requestUpgrade(
    @CurrentUser() user: AuthUser,
    @Body() body: RequestUpgradeDto,
  ) {
    return this.service.requestUpgrade(user, body);
  }
}
