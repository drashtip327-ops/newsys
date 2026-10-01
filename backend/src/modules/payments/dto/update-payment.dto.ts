import { CreatePaymentDto } from './create-payment.dto';
// Updates are allowed only as part of the single rejected-request resubmission.
export class UpdatePaymentDto extends CreatePaymentDto {}
