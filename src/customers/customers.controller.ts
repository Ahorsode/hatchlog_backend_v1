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
import { RequireEntitlement } from '../common/decorators/require-entitlement.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  CreateCustomerDto,
  FarmScopedQueryDto,
  UpdateCustomerDto,
} from '../common/dto/domain.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('api/v1/customers')
@RequireEntitlement('CRM')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequireFarmPermission('customers', 'view')
  @ApiOkResponse({ description: 'List customers for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.customersService.list(user, query);
  }

  @Get(':id')
  @RequireFarmPermission('customers', 'view')
  @ApiOkResponse({ description: 'Get customer by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.customersService.getById(user, id, query.farm_id);
  }

  @Get(':id/stats')
  @RequireFarmPermission('customers', 'view')
  @ApiOkResponse({ description: 'Get customer stats (order count, total spent)' })
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.customersService.getStats(user, id, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('customers', 'edit')
  @ApiOkResponse({ description: 'Create customer' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateCustomerDto) {
    return this.customersService.create(user, body);
  }

  @Patch(':id')
  @RequireFarmPermission('customers', 'edit')
  @ApiOkResponse({ description: 'Update customer' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customersService.update(user, id, body);
  }

  @Delete(':id')
  @RequireFarmPermission('customers', 'edit')
  @ApiOkResponse({ description: 'Delete customer' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.customersService.remove(user, id, query.farm_id);
  }
}
