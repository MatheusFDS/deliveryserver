// src/delivery/providers/tenant-approval.validator.ts

import { Injectable } from '@nestjs/common';
import {
  IDeliveryRulesValidator,
  DeliveryRulesContext,
  DeliveryRulesValidationResult,
} from './delivery-rules.validator.interface';

@Injectable()
export class TenantApprovalValidator implements IDeliveryRulesValidator {
  async validate(
    context: DeliveryRulesContext,
  ): Promise<DeliveryRulesValidationResult> {
    const { tenant, totalValor, totalPeso, ordersCount, valorFrete } = context;
    const reasons: string[] = [];

    if (tenant.minDeliveryPercentage !== null && totalValor > 0) {
      const freightPercentage = (valorFrete / totalValor) * 100;
      if (freightPercentage > tenant.minDeliveryPercentage) {
        reasons.push(
          `Percentual de frete (${freightPercentage.toFixed(
            2,
          )}%) acima do máximo (${tenant.minDeliveryPercentage}%).`,
        );
      }
    }

    if (tenant.minValue !== null && totalValor < tenant.minValue) {
      reasons.push(
        `Valor total (R$ ${totalValor.toFixed(
          2,
        )}) abaixo do mínimo (R$ ${tenant.minValue.toFixed(2)}).`,
      );
    }

    if (tenant.minPeso !== null && totalPeso < tenant.minPeso) {
      reasons.push(
        `Peso total (${totalPeso.toFixed(
          2,
        )} kg) abaixo do mínimo (${tenant.minPeso.toFixed(2)} kg).`,
      );
    }

    if (tenant.minOrders !== null && ordersCount < tenant.minOrders) {
      reasons.push(
        `Quantidade de pedidos (${ordersCount}) abaixo do mínimo (${tenant.minOrders}).`,
      );
    }

    return {
      needsApproval: reasons.length > 0,
      reasons,
    };
  }
}
