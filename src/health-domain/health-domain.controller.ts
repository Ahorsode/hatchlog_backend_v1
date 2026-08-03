import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  CreateHealthSchedulesBulkDto,
  DeleteHealthScheduleDto,
  FarmScopedQueryDto,
  HealthScheduleQueryDto,
  RegisterHealthInventoryItemDto,
  SetHealthItemCostDto,
  UpdateHealthScheduleStatusDto,
} from '../common/dto/domain.dto';
import { HealthDomainService } from './health-domain.service';

@ApiTags('health-schedules')
@ApiBearerAuth()
@Controller('api/v1')
export class HealthDomainController {
  constructor(private readonly service: HealthDomainService) {}

  @Get('health-schedules')
  @RequireFarmPermission('health', 'view')
  @ApiOkResponse({ description: 'List vaccination & medication schedules' })
  listSchedules(
    @CurrentUser() user: AuthUser,
    @Query() query: HealthScheduleQueryDto,
  ) {
    return this.service.listSchedules(user, query);
  }

  @Post('health-schedules')
  @RequireFarmPermission('health', 'edit')
  @ApiOkResponse({ description: 'Create health schedules (single or bulk)' })
  createSchedules(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateHealthSchedulesBulkDto,
  ) {
    return this.service.createSchedulesBulk(user, body);
  }

  @Patch('health-schedules/:id/status')
  @RequireFarmPermission('health', 'edit')
  @ApiOkResponse({ description: 'Update health schedule status' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateHealthScheduleStatusDto,
  ) {
    return this.service.updateScheduleStatus(user, id, body);
  }

  @Delete('health-schedules/:id')
  @RequireFarmPermission('health', 'edit')
  @ApiOkResponse({ description: 'Delete a health schedule' })
  deleteSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: DeleteHealthScheduleDto,
  ) {
    return this.service.deleteSchedule(user, id, body);
  }

  @Get('health-inventory')
  @RequireFarmPermission('health', 'view')
  @ApiOkResponse({ description: 'Get health inventory (vaccines & medications)' })
  healthInventory(
    @CurrentUser() user: AuthUser,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.service.getHealthInventory(user, query.farm_id);
  }

  @Post('health-inventory')
  @RequireFarmPermission('health', 'edit')
  @ApiOkResponse({ description: 'Register a new health inventory item' })
  registerItem(
    @CurrentUser() user: AuthUser,
    @Body() body: RegisterHealthInventoryItemDto,
  ) {
    return this.service.registerHealthInventoryItem(user, body);
  }

  @Patch('health-inventory/:id/cost')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Set cost for a health inventory item' })
  setCost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: SetHealthItemCostDto,
  ) {
    return this.service.setHealthItemCost(user, id, body);
  }
}
