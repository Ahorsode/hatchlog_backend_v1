import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import {
  BatchAnalyticsQueryDto,
  ComprehensiveReportQueryDto,
  MortalityTrendsQueryDto,
} from '../common/dto/domain.dto';
import { AnalyticsService } from './analytics.service';
import { ReportPdfService } from './report-pdf.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
    private readonly reportPdf: ReportPdfService,
  ) {}

  @Get('batch')
  @RequireFarmPermission('batches', 'view')
  @ApiOkResponse({
    description: 'Batch analytics (FCR, feed, weight, mortality)',
  })
  batchAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: BatchAnalyticsQueryDto,
  ) {
    return this.service.getBatchAnalytics(user, query);
  }

  @Get('mortality-trends')
  @RequireFarmPermission('batches', 'view')
  @ApiOkResponse({ description: 'Daily mortality trends' })
  mortalityTrends(
    @CurrentUser() user: AuthUser,
    @Query() query: MortalityTrendsQueryDto,
  ) {
    return this.service.getMortalityTrends(user, query.farm_id);
  }

  @Get('comprehensive-report')
  @RequireFarmPermission('finance', 'view')
  @ApiOkResponse({ description: 'Comprehensive farm report for date range' })
  comprehensiveReport(
    @CurrentUser() user: AuthUser,
    @Query() query: ComprehensiveReportQueryDto,
  ) {
    return this.service.getComprehensiveReport(user, query);
  }

  @Get('comprehensive-report/pdf')
  @RequireFarmPermission('finance', 'view')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Comprehensive farm report as PDF' })
  async comprehensiveReportPdf(
    @CurrentUser() user: AuthUser,
    @Query() query: ComprehensiveReportQueryDto,
  ) {
    const report = await this.service.getComprehensiveReport(user, query);
    const pdf = await this.reportPdf.buildComprehensivePdf(
      report,
      query.start_date,
      query.end_date,
    );
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename=HatchLog_Report_${query.start_date.slice(0, 10)}_to_${query.end_date.slice(0, 10)}.pdf`,
    });
  }
}
