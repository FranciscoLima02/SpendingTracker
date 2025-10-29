// Budget calculation logic updated for extended planning
import { Month, Movement } from './db';

export type IncomeCategoryKey =
  | 'incomeSalary'
  | 'incomeSubsidy'
  | 'incomeMealCard'
  | 'incomeCreditCard'
  | 'incomeExtraordinary';

export type ExpenseCategoryKey =
  | 'rent'
  | 'utilities'
  | 'food'
  | 'leisure'
  | 'shitMoney'
  | 'transport'
  | 'health'
  | 'shopping'
  | 'subscriptions';

export type TransferCategoryKey =
  | 'transferenciaPoupanca'
  | 'compraCryptoCore'
  | 'compraCryptoShit'
  | 'buffer';

export const INCOME_CATEGORY_LABELS: Record<IncomeCategoryKey, string> = {
  incomeSalary: 'Rendimento Base',
  incomeSubsidy: 'Subsídio',
  incomeMealCard: 'Cartão Refeição',
  incomeCreditCard: 'Cartão Crédito',
  incomeExtraordinary: 'Extraordinário',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryKey, string> = {
  rent: 'Renda',
  utilities: 'Contas (Luz, Água, Gás)',
  food: 'Comida',
  leisure: 'Lazer',
  shitMoney: 'Shit Money',
  transport: 'Transporte',
  health: 'Saúde',
  shopping: 'Compras / Necessidades',
  subscriptions: 'Trabalho / Subscrições',
};

export const TRANSFER_CATEGORY_LABELS: Record<TransferCategoryKey, string> = {
  transferenciaPoupanca: 'Poupança',
  compraCryptoCore: 'Crypto Core',
  compraCryptoShit: 'Crypto Shit',
  buffer: 'Buffer / Emergência',
};

export const ESSENTIAL_EXPENSE_KEYS: ExpenseCategoryKey[] = ['rent', 'utilities', 'food'];
export const FIXED_EXPENSE_KEYS: ExpenseCategoryKey[] = ['rent', 'utilities', 'subscriptions'];
export const FUN_EXPENSE_KEYS: ExpenseCategoryKey[] = ['leisure', 'shitMoney'];
export const CRYPTO_TRANSFER_KEYS: TransferCategoryKey[] = ['compraCryptoCore', 'compraCryptoShit'];

function emptyRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<T, number>);
}

export function isSubsidyMonth(month: Month): boolean {
  return month.month === 6 || month.month === 12;
}

export function calculatePlannedIncome(month: Month): Record<IncomeCategoryKey, number> {
  return {
    incomeSalary: month.incomeBase ?? 0,
    incomeSubsidy: isSubsidyMonth(month) ? month.subsidyAmount ?? 0 : 0,
    incomeMealCard: month.incomeMealCard ?? 0,
    incomeCreditCard: month.incomeCreditCard ?? 0,
    incomeExtraordinary: month.incomeExtraordinary ?? 0,
  };
}

export function calculateActualIncome(movements: Movement[]): Record<IncomeCategoryKey, number> {
  const totals = emptyRecord(Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategoryKey[]);

  for (const movement of movements) {
    if (movement.type !== 'income') continue;
    const key = movement.category as IncomeCategoryKey;
    if (key in totals) {
      totals[key] += movement.amount;
    }
  }

  return totals;
}

export function calculatePlannedExpenses(month: Month): Record<ExpenseCategoryKey, number> {
  return {
    rent: month.plannedRent ?? month.fixedExpenses ?? 0,
    utilities: month.plannedUtilities ?? 0,
    food: month.plannedFood ?? month.foodPlanned ?? 0,
    leisure: month.plannedLeisure ?? 0,
    shitMoney: month.plannedShitMoney ?? 0,
    transport: month.plannedTransport ?? 0,
    health: month.plannedHealth ?? 0,
    shopping: month.plannedShopping ?? 0,
    subscriptions: month.plannedSubscriptions ?? 0,
  };
}

export function calculateActualExpenses(movements: Movement[]): Record<ExpenseCategoryKey, number> {
  const totals = emptyRecord(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategoryKey[]);

  for (const movement of movements) {
    if (movement.type !== 'expense') continue;
    const key = movement.category as ExpenseCategoryKey;
    if (key in totals) {
      totals[key] += movement.amount;
    }
  }

  return totals;
}

export function calculatePlannedTransfers(month: Month): Record<TransferCategoryKey, number> {
  return {
    transferenciaPoupanca: month.plannedSavings ?? 0,
    compraCryptoCore: month.plannedCryptoCore ?? 0,
    compraCryptoShit: month.plannedCryptoShit ?? 0,
    buffer: month.plannedBuffer ?? 0,
  };
}

export function calculateActualTransfers(movements: Movement[]): Record<TransferCategoryKey, number> {
  const totals = emptyRecord(Object.keys(TRANSFER_CATEGORY_LABELS) as TransferCategoryKey[]);

  for (const movement of movements) {
    if (movement.type !== 'transfer') continue;
    const key = movement.category as TransferCategoryKey;
    if (key in totals) {
      totals[key] += movement.amount;
    }
  }

  return totals;
}

export function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((sum, value) => sum + value, 0);
}

export function calculatePlannedIncomeTotal(month: Month): number {
  return sumRecord(calculatePlannedIncome(month));
}

export function calculatePlannedOutflows(month: Month): number {
  return (
    sumRecord(calculatePlannedExpenses(month)) +
    sumRecord(calculatePlannedTransfers(month))
  );
}

export function calculatePlannedAvailable(month: Month): number {
  return calculatePlannedIncomeTotal(month) - calculatePlannedOutflows(month);
}

export function calculateActualIncomeTotal(movements: Movement[]): number {
  return sumRecord(calculateActualIncome(movements));
}

export function calculateActualExpenseTotal(movements: Movement[]): number {
  return sumRecord(calculateActualExpenses(movements));
}

export function calculateActualTransferTotal(movements: Movement[]): number {
  return sumRecord(calculateActualTransfers(movements));
}

export function calculateSavingsProgress(month: Month, movements: Movement[]): number {
  const planned = month.plannedSavings ?? 0;
  const actual = calculateActualTransfers(movements).transferenciaPoupanca ?? 0;
  return planned > 0 ? (actual / planned) * 100 : 0;
}

export function calculateEssentialShare(movements: Movement[], month: Month): number {
  const expenses = calculateActualExpenses(movements);
  const incomeTotal = Math.max(calculateActualIncomeTotal(movements), calculatePlannedIncomeTotal(month));
  if (incomeTotal === 0) return 0;

  const essentialTotal = ESSENTIAL_EXPENSE_KEYS.reduce(
    (sum, key) => sum + (expenses[key] ?? 0),
    0,
  );
  return (essentialTotal / incomeTotal) * 100;
}

export function calculateFunShare(movements: Movement[], month: Month): number {
  const expenses = calculateActualExpenses(movements);
  const incomeTotal = Math.max(calculateActualIncomeTotal(movements), calculatePlannedIncomeTotal(month));
  if (incomeTotal === 0) return 0;

  const funTotal = FUN_EXPENSE_KEYS.reduce(
    (sum, key) => sum + (expenses[key] ?? 0),
    0,
  );
  return (funTotal / incomeTotal) * 100;
}

export function calculateCryptoShare(movements: Movement[], month: Month): number {
  const transfers = calculateActualTransfers(movements);
  const incomeTotal = Math.max(calculateActualIncomeTotal(movements), calculatePlannedIncomeTotal(month));
  if (incomeTotal === 0) return 0;

  const cryptoTotal = CRYPTO_TRANSFER_KEYS.reduce(
    (sum, key) => sum + (transfers[key] ?? 0),
    0,
  );
  return (cryptoTotal / incomeTotal) * 100;
}

export function calculateFixedVsVariable(movements: Movement[]): {
  fixed: number;
  variable: number;
} {
  const expenses = calculateActualExpenses(movements);
  const fixed = FIXED_EXPENSE_KEYS.reduce(
    (sum, key) => sum + (expenses[key] ?? 0),
    0,
  );
  const total = sumRecord(expenses);
  return {
    fixed,
    variable: total - fixed,
  };
}

export function calculateCashFlow(month: Month, movements: Movement[]): number {
  const openingBalance = (month.incomeMealCard ?? 0) + (month.incomeCreditCard ?? 0);
  const incomeTotal = calculateActualIncomeTotal(movements);
  const expenseTotal = calculateActualExpenseTotal(movements);
  const transferTotal = calculateActualTransferTotal(movements);
  return openingBalance + incomeTotal - (expenseTotal + transferTotal);
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
