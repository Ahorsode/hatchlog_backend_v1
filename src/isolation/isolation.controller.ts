import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  CreateIsolationRoomDto,
  FarmScopedQueryDto,
  IsolationMortalityDto,
  IsolationReturnDto,
  IsolationTransferDto,
} from '../common/dto/domain.dto';
import { IsolationService } from './isolation.service';

@ApiTags('isolation')
@ApiBearerAuth()
@Controller('api/v1')
export class IsolationController {
  constructor(private readonly isolationService: IsolationService) {}

  @Get('isolation-rooms')
  @RequireFarmPermission('mortality', 'view')
  @ApiOkResponse({ description: 'List isolation rooms for a farm' })
  listRooms(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.isolationService.listRooms(user, query);
  }

  @Post('isolation-rooms')
  @RequireFarmPermission('mortality', 'edit')
  @ApiOkResponse({ description: 'Create an isolation room' })
  createRoom(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateIsolationRoomDto,
  ) {
    return this.isolationService.createRoom(user, body);
  }

  @Post('isolation/transfer')
  @RequireFarmPermission('batches', 'edit')
  @ApiOkResponse({ description: 'Transfer birds to isolation' })
  transfer(@CurrentUser() user: AuthUser, @Body() body: IsolationTransferDto) {
    return this.isolationService.transfer(user, body);
  }

  @Post('isolation/return')
  @RequireFarmPermission('batches', 'edit')
  @ApiOkResponse({ description: 'Return birds from isolation' })
  returnFromIsolation(
    @CurrentUser() user: AuthUser,
    @Body() body: IsolationReturnDto,
  ) {
    return this.isolationService.returnFromIsolation(user, body);
  }

  @Post('isolation/mortality')
  @RequireFarmPermission('mortality', 'edit')
  @ApiOkResponse({ description: 'Log mortality in isolation' })
  logMortality(
    @CurrentUser() user: AuthUser,
    @Body() body: IsolationMortalityDto,
  ) {
    return this.isolationService.logMortality(user, body);
  }
}
