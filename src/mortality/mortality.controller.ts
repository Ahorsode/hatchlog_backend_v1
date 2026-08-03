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
  CreateMortalityDto,
  FarmScopedQueryDto,
  ListQueryDto,
  UpdateMortalityDto,
} from '../common/dto/domain.dto';
import { MortalityService } from './mortality.service';

@ApiTags('mortality')
@ApiBearerAuth()
@Controller('api/v1/mortality')
export class MortalityController {
  constructor(private readonly mortalityService: MortalityService) {}

  @Get()
  @ApiOkResponse({ description: 'List mortality / health events' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.mortalityService.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get mortality record by id' })
  getById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: FarmScopedQueryDto,
  ) {
    return this.mortalityService.getById(user, id, query.farm_id);
  }

  @Post()
  @ApiOkResponse({ description: 'Create mortality / health event' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateMortalityDto) {
    return this.mortalityService.create(user, body);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update mortality record' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateMortalityDto,
  ) {
    return this.mortalityService.update(user, id, body);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Soft-delete mortality record' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mortalityService.remove(user, id);
  }
}
