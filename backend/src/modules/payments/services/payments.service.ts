import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Role, AppState } from '../../../../../shared/payment.types';
import { calculateSummary, createSeedState, isAppState, newestLogs, vendors } from '../../../../../shared/payment-utils';
import { approvePayment, createPayment, rejectPayment, resubmitPayment } from './payment-rules';
import type { StateDto } from '../dto/state.dto';
import type { CreatePaymentDto } from '../dto/create-payment.dto';
import type { UpdatePaymentDto } from '../dto/update-payment.dto';
import type { RejectPaymentDto } from '../dto/reject-payment.dto';
import type { ListPaymentsDto } from '../dto/list-payments.dto';
import { SettingsService } from '../../settings/settings.service';
@Injectable()
export class PaymentsService {
  constructor(private readonly settings: SettingsService) {}
  seed() { return createSeedState(); }
  vendors() { return vendors; }
  private state(dto: StateDto): AppState {
    if (!isAppState(dto.state)) throw new BadRequestException('Saved payment state is invalid. Use Reset Data to restore the seed.');
    return dto.state;
  }
  private perform(operation: () => AppState) {
    try { return operation(); }
    catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : 'Unable to update payment.';
      if (message.includes('not authorized')) throw new ForbiddenException(message);
      if (message.includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }
  create(dto: CreatePaymentDto, role: Role) { return this.perform(() => createPayment(this.state(dto), role, dto.payment)); }
  async approve(id: string, dto: StateDto, role: Role) { const config = (await this.settings.get()).config; return this.perform(() => approvePayment(this.state(dto), role, id, config)); }
  async reject(id: string, dto: RejectPaymentDto, role: Role) { const config = (await this.settings.get()).config; return this.perform(() => rejectPayment(this.state(dto), role, id, dto.comment, config)); }
  async resubmit(id: string, dto: UpdatePaymentDto, role: Role) { const config = (await this.settings.get()).config; return this.perform(() => resubmitPayment(this.state(dto), role, id, dto.payment, config)); }
  summary(dto: StateDto) { return calculateSummary(this.state(dto).payments); }
  audit(dto: StateDto) { return newestLogs(this.state(dto).auditLogs); }
  list(dto: ListPaymentsDto) {
    return this.state(dto).payments.filter(p => (!dto.status || dto.status === p.status) && (!dto.vendor || dto.vendor === p.vendor) && (!dto.search || `${p.req_id} ${p.vendor} ${p.invoice_no} ${p.purpose}`.toLowerCase().includes(dto.search.toLowerCase())));
  }
}
