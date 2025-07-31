// Proposta para: src/delivery/dto/update-delivery.dto.ts (Backend)
import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryDto, OrderReferenceDto } from './create-delivery.dto'; // Importar OrderReferenceDto
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsIn, // Para validar o status contra valores permitidos
} from 'class-validator';
import { Type } from 'class-transformer';
// Se OrderDto for realmente diferente de OrderReferenceDto e necessário aqui:
// import { OrderDto } from '../../orders/dto/order.dto'; // Exemplo de caminho
import { DeliveryStatus } from '../../types/status.enum'; // Importar o enum de status

// Supondo que OrderDto para atualização seja o mesmo que OrderReferenceDto
// Se for diferente, você precisará definir OrderDto e ajustar o @Type()
// Por ora, vou usar OrderReferenceDto para consistência com a criação,
// mas você pode alterar para OrderDto se for sua intenção.
export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  // dataInicio?: string; // Já herdado como opcional de CreateDeliveryDto se adicionado lá

  @IsOptional()
  @IsString()
  @IsIn([
    DeliveryStatus.A_LIBERAR,
    DeliveryStatus.INICIADO,
    DeliveryStatus.FINALIZADO,
    DeliveryStatus.REJEITADO,
  ]) // Validar contra os status permitidos
  status?: string; // Manter como string, mas validar contra o enum

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderReferenceDto) // Alterado para OrderReferenceDto para consistência ou defina OrderDto
  orders?: OrderReferenceDto[]; // Ajustado para OrderReferenceDto ou use seu OrderDto
}
