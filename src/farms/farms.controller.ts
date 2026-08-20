import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowWhenFarmLocked } from '../common/decorators/allow-when-farm-locked.decorator';
import {
  OnboardFarmDto,
  UpdateFarmDto,
  UpdateFarmSettingsDto,
  UpdateSalesSettingsDto,
} from '../common/dto/domain.dto';
import { FarmsService } from './farms.service';

@ApiTags('farms')
@ApiBearerAuth()
@Controller('api/v1/farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Post('onboard')
  @AllowWhenFarmLocked()
  @ApiOkResponse({
    description:
      'Complete farm onboarding (update placeholder farm or create one)',
  })
  onboard(@CurrentUser() user: AuthUser, @Body() body: OnboardFarmDto) {
    return this.farmsService.onboard(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get farm by id' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.farmsService.getById(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update farm info' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateFarmDto,
  ) {
    return this.farmsService.update(user, id, body);
  }

  @Get(':id/settings')
  @ApiOkResponse({ description: 'Get farm settings' })
  getSettings(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.farmsService.getSettings(user, id);
  }

  @Patch(':id/settings')
  @ApiOkResponse({ description: 'Update farm settings' })
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateFarmSettingsDto,
  ) {
    return this.farmsService.updateSettings(user, id, body);
  }

  @Get(':id/sales-settings')
  @ApiOkResponse({ description: 'Get sales settings' })
  getSalesSettings(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.farmsService.getSalesSettings(user, id);
  }

  @Patch(':id/sales-settings')
  @ApiOkResponse({ description: 'Update sales settings' })
  updateSalesSettings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateSalesSettingsDto,
  ) {
    return this.farmsService.updateSalesSettings(user, id, body);
  }
}
