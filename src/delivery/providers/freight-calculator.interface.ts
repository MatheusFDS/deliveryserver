// src/delivery/providers/freight-calculator.interface.ts

import { Order, Vehicle } from '@prisma/client';

export const FREIGHT_CALCULATOR_PROVIDER = 'FreightCalculatorProvider';

export interface FreightCalculationContext {
  orders: Order[];
  vehicle: Vehicle;
  tenantId: string;
}

export interface IFreightCalculator {
  calculate(context: FreightCalculationContext): Promise<number>;
}
