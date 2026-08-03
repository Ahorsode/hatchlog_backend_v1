import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportPdfService } from './report-pdf.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportPdfService],
  exports: [AnalyticsService, ReportPdfService],
})
export class AnalyticsModule {}
