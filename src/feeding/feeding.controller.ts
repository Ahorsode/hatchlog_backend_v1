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
import {
  CreateFeedFormulationDto,
  CreateFeedingDto,
  FarmScopedQueryDto,
  ListQueryDto,
  UpdateFeedingDto,
} from '../common/dto/domain.dto';
import { FeedingService } from './feeding.service';

@ApiTags('feeding')
@ApiBearerAuth()
@Controller('api/v1')
export class FeedingController {
  constructor(private readonly feedingService: FeedingService) {}

  // ── Feeding Logs ──

  @Get('feeding')
  @ApiOkResponse({ description: 'List feeding logs' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.feedingService.list(user, query);
  }

  @Get('feeding/:id')
  @ApiOkResponse({ description: 'Get feeding log by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.feedingService.getById(user, id, query.farm_id);
  }

  @Post('feeding')
  @ApiOkResponse({ description: 'Create feeding log' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateFeedingDto) {
    return this.feedingService.create(user, body);
  }

  @Patch('feeding/:id')
  @ApiOkResponse({ description: 'Update feeding log' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateFeedingDto,
  ) {
    return this.feedingService.update(user, id, body);
  }

  @Delete('feeding/:id')
  @ApiOkResponse({ description: 'Soft-delete feeding log' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.feedingService.remove(user, id);
  }

  @Post('feeding/:id/restore')
  @ApiOkResponse({ description: 'Restore soft-deleted feeding log' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.feedingService.restore(user, id, query.farm_id);
  }

  // ── Feed Formulations ──

  @Get('feed-formulations')
  @ApiOkResponse({ description: 'List feed formulations' })
  listFormulations(
    @CurrentUser() user: AuthUser,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.feedingService.listFormulations(user, query);
  }

  @Post('feed-formulations')
  @ApiOkResponse({ description: 'Create feed formulation' })
  createFormulation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateFeedFormulationDto,
  ) {
    return this.feedingService.createFormulation(user, body);
  }

  @Delete('feed-formulations/:id')
  @ApiOkResponse({ description: 'Delete feed formulation' })
  deleteFormulation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.feedingService.deleteFormulation(user, id, query.farm_id);
  }
}
