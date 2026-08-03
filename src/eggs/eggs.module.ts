import { Module } from '@nestjs/common';
import { EggsController } from './eggs.controller';
import { EggsService } from './eggs.service';

@Module({
  controllers: [EggsController],
  providers: [EggsService],
  exports: [EggsService],
})
export class EggsModule {}
