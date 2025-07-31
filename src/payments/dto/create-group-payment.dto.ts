import { IsArray, IsUUID } from 'class-validator';

export class CreateGroupPaymentDto {
  @IsArray()
  @IsUUID('4', { each: true })
  paymentIds: string[];
}
