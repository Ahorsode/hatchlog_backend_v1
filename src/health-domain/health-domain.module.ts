import { Module } from '@nestjs/common';
import { HealthDomainController } from './health-domain.controller';
import { HealthDomainService } from './health-domain.service';

@Module({
  controllers: [HealthDomainController],
  providers: [HealthDomainService],
  exports: [HealthDomainService],
})
export class HealthDomainModule {}
