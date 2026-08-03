import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  CreateInvitationDto,
  FarmScopedQueryDto,
  UpdateMemberRoleDto,
  UpdatePermissionsDto,
} from '../common/dto/domain.dto';
import { TeamService } from './team.service';

@ApiTags('team')
@ApiBearerAuth()
@Controller('api/v1/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  @RequireFarmPermission('team', 'view')
  @ApiOkResponse({ description: 'List farm members and pending invitations' })
  listMembers(
    @CurrentUser() user: AuthUser,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.teamService.listMembers(user, query);
  }

  @Post('invitations')
  @RequireFarmPermission('team', 'edit')
  @ApiOkResponse({ description: 'Create or update invitation' })
  createInvitation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInvitationDto,
  ) {
    return this.teamService.createInvitation(user, body);
  }

  @Delete('invitations/:id')
  @RequireFarmPermission('team', 'edit')
  @ApiOkResponse({ description: 'Delete pending invitation' })
  deleteInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.teamService.deleteInvitation(user, id, query.farm_id);
  }

  @Delete('members/:userId')
  @RequireFarmPermission('team', 'edit')
  @ApiOkResponse({ description: 'Remove member from farm' })
  deleteMember(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.teamService.deleteMember(user, userId, query.farm_id);
  }

  @Patch('members/:userId/role')
  @RequireFarmPermission('team', 'edit')
  @ApiOkResponse({ description: 'Update member role' })
  updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(user, userId, body);
  }

  @Get('members/:userId/permissions')
  @RequireFarmPermission('team', 'view')
  @ApiOkResponse({ description: 'Get member permissions' })
  getPermissions(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.teamService.getPermissions(user, userId, query.farm_id);
  }

  @Put('members/:userId/permissions')
  @RequireFarmPermission('team', 'edit')
  @ApiOkResponse({ description: 'Update member permissions' })
  updatePermissions(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query() query: FarmScopedQueryDto,
    @Body() body: UpdatePermissionsDto,
  ) {
    return this.teamService.updatePermissions(
      user,
      userId,
      query.farm_id,
      body,
    );
  }
}
