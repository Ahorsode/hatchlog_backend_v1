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
  CreateEggDto,
  FarmScopedQueryDto,
  ListQueryDto,
  UpdateEggDto,
} from '../common/dto/domain.dto';
import { EggsService } from './eggs.service';

@ApiTags('eggs')
@ApiBearerAuth()
@Controller('api/v1/eggs')
export class EggsController {
  constructor(private readonly eggsService: EggsService) {}

  @Get()
  @ApiOkResponse({ description: 'List egg production logs' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.eggsService.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get egg production log by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.eggsService.getById(user, id, query.farm_id);
  }

  @Post()
  @ApiOkResponse({ description: 'Create egg production log' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateEggDto) {
    return this.eggsService.create(user, body);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update egg production log' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateEggDto,
  ) {
    return this.eggsService.update(user, id, body);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Soft-delete egg production log' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eggsService.remove(user, id);
  }
}
