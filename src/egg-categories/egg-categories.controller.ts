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
  CreateEggCategoryDto,
  FarmScopedQueryDto,
  UpdateEggCategoryDto,
} from '../common/dto/domain.dto';
import { EggCategoriesService } from './egg-categories.service';

@ApiTags('egg-categories')
@ApiBearerAuth()
@Controller('api/v1/egg-categories')
export class EggCategoriesController {
  constructor(private readonly eggCategoriesService: EggCategoriesService) {}

  @Get()
  @RequireFarmPermission('eggs', 'view')
  @ApiOkResponse({ description: 'List egg categories for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: FarmScopedQueryDto) {
    return this.eggCategoriesService.list(user, query);
  }

  @Post()
  @RequireFarmPermission('eggs', 'edit')
  @ApiOkResponse({ description: 'Create egg category' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateEggCategoryDto) {
    return this.eggCategoriesService.create(user, body);
  }

  @Patch(':id')
  @RequireFarmPermission('eggs', 'edit')
  @ApiOkResponse({ description: 'Update egg category' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateEggCategoryDto,
  ) {
    return this.eggCategoriesService.update(user, id, body);
  }

  @Delete(':id')
  @RequireFarmPermission('eggs', 'edit')
  @ApiOkResponse({ description: 'Delete egg category' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.eggCategoriesService.remove(user, id, query.farm_id);
  }
}
