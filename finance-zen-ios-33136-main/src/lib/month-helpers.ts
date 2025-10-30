import { Month } from "./db";

const DEFAULT_DISTRIBUTION = {
  core: 0.25,
  shit: 0.1,
  savings: 0.25,
  fun: 0.25,
  buffer: 0.15,
} as const;

const DEFAULT_SUBSIDY_DISTRIBUTION = {
  savings: 0.35,
  core: 0.3,
  shit: 0.1,
  fun: 0.25,
} as const;

export function normalizeMonth(month: Month): Month {
  const actualFixed = month.actualFixedExpenses ?? month.fixedExpenses ?? 0;
  const actualFood = month.actualFoodExpenses ?? month.plannedFood ?? month.foodPlanned ?? 0;

  return {
    ...month,
    incomeBase: month.incomeBase ?? 0,
    incomeMealCard: month.incomeMealCard ?? 0,
    incomeExtraordinary: month.incomeExtraordinary ?? 0,
    subsidyAmount: month.subsidyAmount ?? 0,
    subsidyApplied: month.subsidyApplied ?? false,
    actualFixedExpenses: actualFixed,
    actualFoodExpenses: actualFood,
    availableCash: month.availableCash ?? 0,
    fixedExpenses: month.fixedExpenses ?? 0,
    distributionCore: month.distributionCore ?? DEFAULT_DISTRIBUTION.core,
    distributionShit: month.distributionShit ?? DEFAULT_DISTRIBUTION.shit,
    distributionSavings: month.distributionSavings ?? DEFAULT_DISTRIBUTION.savings,
    distributionFun: month.distributionFun ?? DEFAULT_DISTRIBUTION.fun,
    distributionBuffer: month.distributionBuffer ?? DEFAULT_DISTRIBUTION.buffer,
    subsidyDistributionSavings:
      month.subsidyDistributionSavings ?? DEFAULT_SUBSIDY_DISTRIBUTION.savings,
    subsidyDistributionCore: month.subsidyDistributionCore ?? DEFAULT_SUBSIDY_DISTRIBUTION.core,
    subsidyDistributionShit: month.subsidyDistributionShit ?? DEFAULT_SUBSIDY_DISTRIBUTION.shit,
    subsidyDistributionFun: month.subsidyDistributionFun ?? DEFAULT_SUBSIDY_DISTRIBUTION.fun,
    plannedRent: month.plannedRent ?? month.fixedExpenses ?? 0,
    plannedUtilities: month.plannedUtilities ?? 0,
    plannedFood: month.plannedFood ?? month.foodPlanned ?? 0,
    plannedLeisure: month.plannedLeisure ?? 0,
    plannedShitMoney: month.plannedShitMoney ?? 0,
    plannedTransport: month.plannedTransport ?? 0,
    plannedHealth: month.plannedHealth ?? 0,
    plannedShopping: month.plannedShopping ?? 0,
    plannedSubscriptions: month.plannedSubscriptions ?? 0,
    plannedBuffer: month.plannedBuffer ?? 0,
    plannedSavings: month.plannedSavings ?? 0,
    plannedCryptoCore: month.plannedCryptoCore ?? 0,
    plannedCryptoShit: month.plannedCryptoShit ?? 0,
  };
}

export function normalizeMonthOrNull(month: Month | null): Month | null {
  return month ? normalizeMonth(month) : null;
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }

  return { year, month: month + 1 };
}

