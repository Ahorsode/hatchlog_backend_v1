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
  CreateExpenseDto,
  DeleteExpenseDto,
  FarmScopedQueryDto,
} from '../common/dto/domain.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @RequireFarmPermission('finance', 'view')
  @ApiOkResponse({ description: 'List expenses for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.service.list(user, query.farm_id);
  }

  @Get('allocation-batches')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({
    description: 'Get active batches available for expense allocation',
  })
  allocationBatches(
    @CurrentUser() user: AuthUser,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.service.getActiveAllocationBatches(user, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Create a new expense' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateExpenseDto) {
    return this.service.create(user, body);
  }

  @Delete(':id')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Soft-delete an expense' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: DeleteExpenseDto,
  ) {
    return this.service.remove(user, id, body);
  }

  @Post(':id/restore')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Restore a soft-deleted expense' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.service.restore(user, id, query.farm_id);
  }
}
