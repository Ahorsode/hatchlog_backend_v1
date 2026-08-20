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
  CreateHouseDto,
  FarmScopedQueryDto,
  ListQueryDto,
  UpdateHouseDto,
} from '../common/dto/domain.dto';
import { HousesService } from './houses.service';

@ApiTags('houses')
@ApiBearerAuth()
@Controller('api/v1/houses')
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Get()
  @ApiOkResponse({ description: 'List houses for a farm' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.housesService.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get house by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.housesService.getById(user, id, query.farm_id);
  }

  @Post()
  @ApiOkResponse({ description: 'Create house' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateHouseDto) {
    return this.housesService.create(user, body);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update house' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateHouseDto,
  ) {
    return this.housesService.update(user, id, body);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Delete house' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.housesService.remove(user, id);
  }
}
