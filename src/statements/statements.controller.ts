import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import { FarmScopedQueryDto } from '../common/dto/domain.dto';
import { StatementsService } from './statements.service';

@ApiTags('statements')
@ApiBearerAuth()
@Controller('api/v1/statements')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Get('customer/:id')
  @RequireFarmPermission('finance', 'view')
  @ApiOkResponse({ description: 'Get customer statement data' })
  customerStatement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.statementsService.getCustomerStatement(
      user,
      id,
      query.farm_id,
    );
  }

  @Get('supplier/:id')
  @RequireFarmPermission('finance', 'view')
  @ApiOkResponse({ description: 'Get supplier statement data' })
  supplierStatement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.statementsService.getSupplierStatement(
      user,
      id,
      query.farm_id,
    );
  }
}
