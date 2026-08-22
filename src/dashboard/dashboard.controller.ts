import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowWhenFarmLocked } from '../common/decorators/allow-when-farm-locked.decorator';
import { DashboardQueryDto } from '../common/dto/domain.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @AllowWhenFarmLocked()
  @ApiOkResponse({ description: 'Main dashboard KPIs' })
  stats(@CurrentUser() user: AuthUser, @Query() query: DashboardQueryDto) {
    return this.service.getStats(user, query.farm_id);
  }

  @Get('monthly-summary')
  @AllowWhenFarmLocked()
  @ApiOkResponse({ description: 'Current-month revenue, expenses, eggs' })
  monthlySummary(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.service.getMonthlySummary(user, query.farm_id);
  }
}
