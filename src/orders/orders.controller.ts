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
  CreateOrderDto,
  FarmScopedQueryDto,
  SoftDeleteDto,
  UpdateOrderStatusDto,
} from '../common/dto/domain.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequireFarmPermission('sales', 'view')
  @ApiOkResponse({ description: 'List orders for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.ordersService.list(user, query);
  }

  @Get(':id')
  @RequireFarmPermission('sales', 'view')
  @ApiOkResponse({ description: 'Get order by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.ordersService.getById(user, id, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Create order' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) {
    return this.ordersService.create(user, body);
  }

  @Patch(':id/status')
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Update order status' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, body);
  }

  @Delete(':id')
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Soft-delete order' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
    @Body() body: SoftDeleteDto,
  ) {
    return this.ordersService.remove(user, id, query.farm_id, body.reason);
  }

  @Post(':id/restore')
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Restore soft-deleted order' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.ordersService.restore(user, id, query.farm_id);
  }
}
