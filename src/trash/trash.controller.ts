import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import { FarmScopedQueryDto } from '../common/dto/domain.dto';
import { TrashService } from './trash.service';

@ApiTags('trash')
@ApiBearerAuth()
@Controller('api/v1/trash')
export class TrashController {
  constructor(private readonly service: TrashService) {}

  @Get()
  @RequireFarmPermission('batches', 'view')
  @ApiOkResponse({ description: 'List all soft-deleted records for the farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.service.list(user, query.farm_id);
  }

  @Post(':table/:id/restore')
  @RequireFarmPermission('batches', 'edit')
  @ApiOkResponse({ description: 'Restore a soft-deleted record' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('table') table: string,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.service.restore(user, table, id, query.farm_id);
  }
}
