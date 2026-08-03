import { Module } from '@nestjs/common';
import { GrowthStandardsController } from './growth-standards.controller';
import { GrowthStandardsService } from './growth-standards.service';

@Module({
  controllers: [GrowthStandardsController],
  providers: [GrowthStandardsService],
  exports: [GrowthStandardsService],
})
export class GrowthStandardsModule {}
