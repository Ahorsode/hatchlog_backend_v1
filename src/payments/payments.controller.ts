import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFarmPermission } from '../common/decorators/require-farm-permission.decorator';
import { RecordPaymentDto } from '../common/dto/domain.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireFarmPermission('finance', 'edit')
  @ApiOkResponse({ description: 'Record a customer payment' })
  recordPayment(@CurrentUser() user: AuthUser, @Body() body: RecordPaymentDto) {
    return this.paymentsService.recordPayment(user, body);
  }
}
