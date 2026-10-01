import { IsObject } from 'class-validator';
import type { AppState } from '../../../../../shared/payment.types';
export class StateDto {
  // Full shape is checked by isAppState in the service before any operation.
  @IsObject() state!: AppState;
}
