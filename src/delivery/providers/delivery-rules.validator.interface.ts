// src/delivery/providers/delivery-rules.validator.interface.ts

import { Tenant } from '@prisma/client';

export const DELIVERY_RULES_VALIDATOR_PROVIDER =
  'DeliveryRulesValidatorProvider';

export interface DeliveryRulesContext {
  totalValor: number;
  totalPeso: number;
  ordersCount: number;
  valorFrete: number;
  tenant: Tenant;
}

export interface DeliveryRulesValidationResult {
  needsApproval: boolean;
  reasons: string[];
}

export interface IDeliveryRulesValidator {
  validate(
    context: DeliveryRulesContext,
  ): Promise<DeliveryRulesValidationResult>;
}
