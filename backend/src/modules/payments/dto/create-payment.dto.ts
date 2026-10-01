import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsNumber, IsPositive, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { vendors } from '../../../../../shared/payment-utils';
import { StateDto } from './state.dto';
export class PaymentFieldsDto {
  @IsIn(vendors) vendor!: string;
  @IsNumber() @IsPositive() amount!: number;
  @IsString() @Matches(/\S/, { message: 'Purpose is required.' }) @MaxLength(2000) purpose!: string;
  @IsString() @Matches(/\S/, { message: 'Invoice number is required.' }) @MaxLength(200) invoice_no!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) request_date!: string;
}
export class CreatePaymentDto extends StateDto {
  @IsDefined() @ValidateNested() @Type(() => PaymentFieldsDto) payment!: PaymentFieldsDto;
}
