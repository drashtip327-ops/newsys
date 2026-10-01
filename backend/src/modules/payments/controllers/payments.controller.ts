import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { RoleRequest } from '../../../common/types/auth-request';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { RejectPaymentDto } from '../dto/reject-payment.dto';
import { StateDto } from '../dto/state.dto';
import { ListPaymentsDto } from '../dto/list-payments.dto';
import { RequirePage } from '../../../common/guards/access.guard';
@Controller('payments')
@RequirePage('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Get('seed') seed() { return this.service.seed(); }
  @Get('vendors') vendors() { return this.service.vendors(); }
  @Post('list') list(@Body() dto: ListPaymentsDto) { return this.service.list(dto); }
  @Post('summary') summary(@Body() dto: StateDto) { return this.service.summary(dto); }
  @RequirePage('audit') @Post('audit') audit(@Body() dto: StateDto) { return this.service.audit(dto); }
  @Post() create(@Body() dto: CreatePaymentDto, @Req() req: RoleRequest) { return this.service.create(dto, req.role); }
  @Post(':id/approve') approve(@Param('id') id: string, @Body() dto: StateDto, @Req() req: RoleRequest) { return this.service.approve(id, dto, req.role); }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() dto: RejectPaymentDto, @Req() req: RoleRequest) { return this.service.reject(id, dto, req.role); }
  @Post(':id/resubmit') resubmit(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @Req() req: RoleRequest) { return this.service.resubmit(id, dto, req.role); }
}
