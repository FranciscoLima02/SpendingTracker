// Budget calculation logic
import { Month, Movement } from './db';

export function isSubsidyMonth(month: Month): boolean {
  return month.month === 6 || month.month === 12;
}

export function calculateIncomeTotal(month: Month): number {
  const subsidyExtra = isSubsidyMonth(month) && month.subsidyApplied ? month.subsidyAmount : 0;
  return month.incomeBase + subsidyExtra;
}

export function calculatePlannedExpenses(month: Month): number {
  return month.fixedExpenses + (month.foodSeparate ? month.foodPlanned : 0);
}

export function calculatePlannedAvailable(month: Month): number {
  return calculateIncomeTotal(month) - calculatePlannedExpenses(month);
}

export function getDistributions(month: Month) {
  if (isSubsidyMonth(month) && month.subsidyApplied) {
    return {
      core: month.distributionCore,
      shit: month.distributionShit,
      savings: month.distributionSavings,
      fun: month.distributionFun,
      buffer: 0,
    };
  }
  return {
    core: month.distributionCore,
    shit: month.distributionShit,
    savings: month.distributionSavings,
    fun: month.distributionFun,
    buffer: month.distributionBuffer,
  };
}

export function calculateTargets(month: Month) {
  const available = Math.max(0, calculatePlannedAvailable(month));
  const dist = getDistributions(month);
  
  return {
    core: available * dist.core,
    shit: available * dist.shit,
    savings: available * dist.savings,
    fun: available * dist.fun,
    buffer: available * dist.buffer,
  };
}

export function calculateRealTotals(movements: Movement[]) {
  let core = 0;
  let shit = 0;
  let savings = 0;
  let fun = 0;
  let buffer = 0;

  for (const m of movements) {
    if (m.type === 'income') continue; // Income doesn't consume targets

    switch (m.category) {
      case 'compraCryptoCore':
        core += m.amount;
        break;
      case 'compraCryptoShit':
        shit += m.amount;
        break;
      case 'transferenciaPoupanca':
        savings += m.amount;
        break;
      case 'lazer':
        fun += m.amount;
        break;
      case 'buffer':
        buffer += m.amount;
        break;
    }
  }

  return { core, shit, savings, fun, buffer };
}

export function calculateFaltaGastar(month: Month, movements: Movement[]): number {
  const targets = calculateTargets(month);
  const reals = calculateRealTotals(movements);
  return Math.max(0, targets.fun - reals.fun);
}

export function calculateSavingsProgress(month: Month, movements: Movement[]): number {
  const targets = calculateTargets(month);
  const reals = calculateRealTotals(movements);
  return targets.savings > 0 ? (reals.savings / targets.savings) * 100 : 0;
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
