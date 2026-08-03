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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateLivestockDto,
  CreateWeightRecordDto,
  FarmScopedQueryDto,
  ListQueryDto,
  SoftDeleteDto,
  UpdateLivestockDto,
} from '../common/dto/domain.dto';
import { LivestockService } from './livestock.service';

@ApiTags('livestock')
@ApiBearerAuth()
@Controller('api/v1/livestock')
export class LivestockController {
  constructor(private readonly livestockService: LivestockService) {}

  @Get()
  @ApiOkResponse({ description: 'List livestock batches for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.livestockService.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get livestock batch by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.livestockService.getById(user, id, query.farm_id);
  }

  @Get(':id/details')
  @ApiOkResponse({ description: 'Get livestock batch with rich includes' })
  getDetails(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.livestockService.getDetails(user, id, query.farm_id);
  }

  @Post()
  @ApiOkResponse({ description: 'Create livestock batch' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateLivestockDto) {
    return this.livestockService.create(user, body);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update livestock batch' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateLivestockDto,
  ) {
    return this.livestockService.update(user, id, body);
  }

  @Post(':id/weight')
  @ApiOkResponse({ description: 'Add weight record for a batch' })
  addWeight(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateWeightRecordDto,
  ) {
    return this.livestockService.addWeight(user, id, body);
  }

  @Post(':id/restore')
  @ApiOkResponse({ description: 'Restore soft-deleted livestock batch' })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.livestockService.restore(user, id, query.farm_id);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Soft-delete livestock batch' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: SoftDeleteDto,
  ) {
    return this.livestockService.remove(user, id, body);
  }
}
