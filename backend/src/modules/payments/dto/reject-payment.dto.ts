import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { StateDto } from './state.dto';
export class RejectPaymentDto extends StateDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(2000)
  comment!: string;
}
