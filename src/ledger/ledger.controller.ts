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
  CreateLedgerTransactionDto,
  DeleteLedgerTransactionDto,
  FarmScopedQueryDto,
  SettleLedgerTransactionDto,
} from '../common/dto/domain.dto';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@ApiBearerAuth()
@Controller('api/v1/ledger')
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get()
  @RequireFarmPermission('finance', 'view')
  @ApiOkResponse({ description: 'List financial transactions + expenses merged' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.service.list(user, query.farm_id);
  }

  @Post()
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Create a financial transaction' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateLedgerTransactionDto,
  ) {
    return this.service.create(user, body);
  }

  @Patch(':id/settle')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Settle an outstanding transaction' })
  settle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: SettleLedgerTransactionDto,
  ) {
    return this.service.settle(user, id, body);
  }

  @Delete(':id')
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Soft-delete a financial transaction' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: DeleteLedgerTransactionDto,
  ) {
    return this.service.remove(user, id, body);
  }
}
