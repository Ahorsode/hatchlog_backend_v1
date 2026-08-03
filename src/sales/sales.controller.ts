import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  CreateSaleDto,
  FarmScopedQueryDto,
  SoftDeleteDto,
} from '../common/dto/domain.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('api/v1/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequireFarmPermission('sales', 'view')
  @ApiOkResponse({ description: 'List sales for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.salesService.list(user, query);
  }

  @Post()
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Create sale' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateSaleDto) {
    return this.salesService.create(user, body);
  }

  @Delete(':id')
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Soft-delete sale' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
    @Body() body: SoftDeleteDto,
  ) {
    return this.salesService.remove(user, id, query.farm_id, body.reason);
  }

  @Post(':id/restore')
  @RequireFarmPermission('sales', 'edit')
  @ApiOkResponse({ description: 'Restore soft-deleted sale' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.salesService.restore(user, id, query.farm_id);
  }
}
