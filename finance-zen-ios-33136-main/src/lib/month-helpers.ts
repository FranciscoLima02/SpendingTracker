import { Month } from "./db";

export function normalizeMonth(month: Month): Month {
  return {
    ...month,
    incomeMealCard: month.incomeMealCard ?? 0,
    incomeCreditCard: month.incomeCreditCard ?? 0,
    incomeExtraordinary: month.incomeExtraordinary ?? 0,
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

