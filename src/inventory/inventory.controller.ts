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
  CreateInventoryDto,
  FarmScopedQueryDto,
  InventoryQueryDto,
  SoftDeleteDto,
  UpdateInventoryDto,
} from '../common/dto/domain.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequireFarmPermission('inventory', 'view')
  @ApiOkResponse({ description: 'List inventory items for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: InventoryQueryDto) {
    return this.inventoryService.list(user, query);
  }

  @Get('eggs/stock')
  @RequireFarmPermission('inventory', 'view')
  @ApiOkResponse({ description: 'Get egg inventory stock (FIFO availability)' })
  eggStock(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.inventoryService.getEggStock(user, query.farm_id);
  }

  @Get(':id')
  @RequireFarmPermission('inventory', 'view')
  @ApiOkResponse({ description: 'Get inventory item by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.inventoryService.getById(user, id, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('inventory', 'edit')
  @ApiOkResponse({ description: 'Create inventory item' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateInventoryDto) {
    return this.inventoryService.create(user, body);
  }

  @Patch(':id')
  @RequireFarmPermission('inventory', 'edit')
  @ApiOkResponse({ description: 'Update inventory item' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(user, id, body);
  }

  @Delete(':id')
  @RequireFarmPermission('inventory', 'edit')
  @ApiOkResponse({ description: 'Soft-delete inventory item' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
    @Body() body: SoftDeleteDto,
  ) {
    return this.inventoryService.remove(user, id, query.farm_id, body.reason);
  }

  @Post(':id/restore')
  @RequireFarmPermission('inventory', 'edit')
  @ApiOkResponse({ description: 'Restore soft-deleted inventory item' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.inventoryService.restore(user, id, query.farm_id);
  }
}
