import { Module } from '@nestjs/common';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';

@Module({
  controllers: [LivestockController],
  providers: [LivestockService],
  exports: [LivestockService],
})
export class LivestockModule {}
