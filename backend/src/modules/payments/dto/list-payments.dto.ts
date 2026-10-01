import { IsIn, IsOptional, IsString } from 'class-validator';
import { statuses } from '../../../../../shared/payment.types';
import { StateDto } from './state.dto';
export class ListPaymentsDto extends StateDto {
  @IsOptional() @IsIn(statuses) status?: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() search?: string;
}
