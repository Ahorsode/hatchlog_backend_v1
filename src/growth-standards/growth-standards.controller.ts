import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GrowthStandardsService } from './growth-standards.service';

@ApiTags('growth-standards')
@ApiBearerAuth()
@Controller('api/v1/growth-standards')
export class GrowthStandardsController {
  constructor(private readonly service: GrowthStandardsService) {}

  @Get()
  @ApiOkResponse({
    description: 'List growth standards (optional type filter)',
  })
  list(@Query('type') type?: string) {
    return this.service.list(type);
  }
}
