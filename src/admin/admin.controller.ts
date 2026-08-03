import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminService } from './admin.service';

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

  @Get('licenses')
  @ApiOkResponse({ description: 'List issued licenses (admin)' })
  listLicenses() {
    return this.service.listLicenses();
  }

  @Get('licenses/:id')
  @ApiOkResponse({ description: 'Get license details (admin)' })
  getLicense(@Param('id') id: string) {
    return this.service.getLicense(id);
  }
}
