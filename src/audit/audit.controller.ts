import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import { AuditQueryDto } from '../common/dto/domain.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('insert-logs')
  @RequireFarmPermission('team', 'view')
  @ApiOkResponse({ description: 'Get insert audit logs' })
  insertLogs(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    return this.service.getInsertLogs(user, query.farm_id);
  }

  @Get('delete-logs')
  @RequireFarmPermission('team', 'view')
  @ApiOkResponse({ description: 'Get delete audit logs' })
  deleteLogs(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    return this.service.getDeleteLogs(user, query.farm_id);
  }

  @Get('edit-logs')
  @RequireFarmPermission('team', 'view')
  @ApiOkResponse({ description: 'Get edit audit logs' })
  editLogs(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
    return this.service.getEditLogs(user, query.farm_id);
  }
}
