import { Injectable } from '@nestjs/common';

export interface CalcInput {
  baseSalary: number;
  daysInPeriod?: number;
  daysWorked?: number;
  taxRatePct?: number; // e.g., 10 for 10%
  pensionPct?: number;
  insurancePct?: number;
  penalties?: number;
  refunds?: number;
  bonus?: number;
  benefit?: number;
}

export interface CalcResult {
  gross: number;
  proratedGross: number;
  taxes: number;
  pension: number;
  insurance: number;
  deductions: number;
  netPay: number;
}

@Injectable()
export class PayCalculatorService {
  calculate(input: CalcInput): CalcResult {
    const daysInPeriod = input.daysInPeriod ?? 30;
    const daysWorked = input.daysWorked ?? daysInPeriod;
    const gross = input.baseSalary;
    const proratedGross = gross * (daysWorked / daysInPeriod);
    const taxes = proratedGross * ((input.taxRatePct ?? 0) / 100);
    const pension = proratedGross * ((input.pensionPct ?? 0) / 100);
    const insurance = proratedGross * ((input.insurancePct ?? 0) / 100);
    const penalties = input.penalties ?? 0;
    const refunds = input.refunds ?? 0;
    const bonus = input.bonus ?? 0;
    const benefit = input.benefit ?? 0;
    const deductions = taxes + pension + insurance + penalties;
    const netPay = proratedGross - deductions + refunds + bonus + benefit;
    return {
      gross,
      proratedGross,
      taxes,
      pension,
      insurance,
      deductions,
      netPay,
    };
  }
}
