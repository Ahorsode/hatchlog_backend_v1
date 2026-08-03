import { Module } from '@nestjs/common';
import { IsolationController } from './isolation.controller';
import { IsolationService } from './isolation.service';

@Module({
  controllers: [IsolationController],
  providers: [IsolationService],
  exports: [IsolationService],
})
export class IsolationModule {}
