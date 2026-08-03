import {
  Body,
  Controller,
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
  CreateSupplierDto,
  FarmScopedQueryDto,
  UpdateSupplierBalanceDto,
} from '../common/dto/domain.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('api/v1/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequireFarmPermission('customers', 'view')
  @ApiOkResponse({ description: 'List suppliers for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.suppliersService.list(user, query);
  }

  @Get(':id/stats')
  @RequireFarmPermission('customers', 'view')
  @ApiOkResponse({ description: 'Get supplier stats' })
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.suppliersService.getStats(user, id, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('customers', 'edit')
  @ApiOkResponse({ description: 'Create supplier' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateSupplierDto) {
    return this.suppliersService.create(user, body);
  }

  @Patch(':id')
  @RequireFarmPermission('customers', 'edit')
  @ApiOkResponse({ description: 'Update supplier balance' })
  updateBalance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateSupplierBalanceDto,
  ) {
    return this.suppliersService.updateBalance(user, id, body);
  }
}
