import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminService } from './admin.service';
import {
  BindDeviceDto,
  ConfirmPaymentDto,
  ExtendTrialDto,
  IssueLicenseDto,
  RenewLicenseDto,
  RevokeFarmDto,
  UpgradeTierDto,
} from './dto/admin.dto';

class ActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

@ApiTags('admin')
@ApiHeader({ name: 'X-HatchLog-Admin-Key', description: 'Admin API key' })
@Controller('api/v1/admin')
@Public()
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('farms')
  @ApiOkResponse({ description: 'List all farms (admin)' })
  listFarms() {
    return this.service.listFarms();
  }

  @Get('farms/:id')
  @ApiOkResponse({ description: 'Get farm details (admin)' })
  getFarm(@Param('id') id: string) {
    return this.service.getFarm(id);
  }

  @Post('farms/:id/upgrade-tier')
  @ApiOkResponse({ description: 'Upgrade farm subscription tier' })
  upgradeTier(@Param('id') id: string, @Body() dto: UpgradeTierDto) {
    return this.service.upgradeTier(id, dto);
  }

  @Post('farms/:id/extend-trial')
  @ApiOkResponse({ description: 'Extend farm trial period' })
  extendTrial(@Param('id') id: string, @Body() dto: ExtendTrialDto) {
    return this.service.extendTrial(id, dto);
  }

  @Patch('farms/:id/revoke')
  @ApiOkResponse({ description: 'Revoke farm access' })
  revokeFarm(@Param('id') id: string, @Body() dto: RevokeFarmDto) {
    return this.service.revokeFarm(id, dto);
  }

  @Get('licenses')
  @ApiOkResponse({ description: 'List issued licenses (admin)' })
  listLicenses() {
    return this.service.listLicenses();
  }

  @Get('licenses/by-hardware/:hardwareId')
  @ApiOkResponse({ description: 'Lookup device/license by hardware ID' })
  getDeviceByHardware(@Param('hardwareId') hardwareId: string) {
    return this.service.getDeviceByHardwareId(hardwareId);
  }

  @Get('licenses/:id')
  @ApiOkResponse({ description: 'Get license details (admin)' })
  getLicense(@Param('id') id: string) {
    return this.service.getLicense(id);
  }

  @Post('licenses/issue')
  @ApiOkResponse({ description: 'Issue a manual desktop license key' })
  issueLicense(@Body() dto: IssueLicenseDto) {
    return this.service.issueLicense(dto);
  }

  @Post('licenses/renew')
  @ApiOkResponse({ description: 'Renew license by hardware ID' })
  renewLicense(@Body() dto: RenewLicenseDto) {
    return this.service.renewLicense(dto);
  }

  @Post('licenses/confirm-payment')
  @ApiOkResponse({ description: 'Confirm manual license payment' })
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.service.confirmPayment(dto);
  }

  @Post('licenses/bind-device')
  @ApiOkResponse({ description: 'Bind desktop hardware to web account' })
  bindDevice(@Body() dto: BindDeviceDto) {
    return this.service.bindDevice(dto);
  }

  @Get('payments/dashboard')
  @ApiOkResponse({ description: 'Payment admin dashboard metrics and rows' })
  paymentDashboard() {
    return this.service.getPaymentDashboard();
  }

  @Get('activity')
  @ApiOkResponse({ description: 'Recent admin/subscription activity' })
  listActivity(@Query() query: ActivityQueryDto) {
    return this.service.listActivity(query.limit);
  }

  @Get('users')
  @ApiOkResponse({ description: 'List web accounts for admin mapping' })
  listUsers() {
    return this.service.listUsers();
  }
}
