// Budget calculation logic updated for extended planning
import { Month, Movement, Account, AccountBalance } from './db';

export type IncomeCategoryKey =
  | 'incomeSalary'
  | 'incomeSubsidy'
  | 'incomeMealCard'
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

const ZERO_TARGETS = {
  savings: 0,
  cryptoCore: 0,
  shitMoney: 0,
  leisure: 0,
  buffer: 0,
};

const ZERO_SUBSIDY_TARGETS = {
  savings: 0,
  cryptoCore: 0,
  shitMoney: 0,
  leisure: 0,
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const EMPTY_MONTH_DISTRIBUTION: MonthDistributionTargets = {
  totalIncome: 0,
  incomeBase: 0,
  incomeMealCard: 0,
  incomeExtraordinary: 0,
  incomeSubsidy: 0,
  availableCash: 0,
  baseAvailable: 0,
  baseTargets: { ...ZERO_TARGETS },
  subsidyTargets: { ...ZERO_SUBSIDY_TARGETS },
  combinedTargets: { ...ZERO_TARGETS },
  mealCardBudget: 0,
  subsidyApplied: false,
};

export interface MonthDistributionTargets {
  totalIncome: number;
  incomeBase: number;
  incomeMealCard: number;
  incomeExtraordinary: number;
  incomeSubsidy: number;
  availableCash: number;
  baseAvailable: number;
  baseTargets: typeof ZERO_TARGETS;
  subsidyTargets: typeof ZERO_SUBSIDY_TARGETS;
  combinedTargets: typeof ZERO_TARGETS;
  mealCardBudget: number;
  subsidyApplied: boolean;
}

export function calculateMonthDistribution(month: Month): MonthDistributionTargets {
  const baseDistribution = {
    core: month.distributionCore ?? DEFAULT_DISTRIBUTION.core,
    shit: month.distributionShit ?? DEFAULT_DISTRIBUTION.shit,
    savings: month.distributionSavings ?? DEFAULT_DISTRIBUTION.savings,
    fun: month.distributionFun ?? DEFAULT_DISTRIBUTION.fun,
    buffer: month.distributionBuffer ?? DEFAULT_DISTRIBUTION.buffer,
  };

  const subsidyDistribution = {
    savings: month.subsidyDistributionSavings ?? DEFAULT_SUBSIDY_DISTRIBUTION.savings,
    core: month.subsidyDistributionCore ?? DEFAULT_SUBSIDY_DISTRIBUTION.core,
    shit: month.subsidyDistributionShit ?? DEFAULT_SUBSIDY_DISTRIBUTION.shit,
    fun: month.subsidyDistributionFun ?? DEFAULT_SUBSIDY_DISTRIBUTION.fun,
  };

  const incomeBase = month.incomeBase ?? 0;
  const incomeMealCard = month.incomeMealCard ?? 0;
  const incomeExtraordinary = month.incomeExtraordinary ?? 0;
  const subsidyAmount = month.subsidyApplied ? month.subsidyAmount ?? 0 : 0;

  const totalIncome = incomeBase + incomeMealCard + incomeExtraordinary + subsidyAmount;

  const actualFixed = month.actualFixedExpenses ?? month.fixedExpenses ?? 0;
  const actualFood = month.actualFoodExpenses ?? month.plannedFood ?? month.foodPlanned ?? 0;

  const includesSubsidyInExtra = isSubsidyMonth(month) && subsidyAmount > 0;
  const baseIncomePool = incomeBase + (includesSubsidyInExtra ? 0 : incomeExtraordinary);
  const baseAvailable = Math.max(baseIncomePool - (actualFixed + actualFood), 0);

  const baseTargets = {
    savings: roundCurrency(baseAvailable * baseDistribution.savings),
    cryptoCore: roundCurrency(baseAvailable * baseDistribution.core),
    shitMoney: roundCurrency(baseAvailable * baseDistribution.shit),
    leisure: roundCurrency(baseAvailable * baseDistribution.fun),
    buffer: roundCurrency(baseAvailable * baseDistribution.buffer),
  };

  const subsidyTargets = includesSubsidyInExtra
    ? {
        savings: roundCurrency(subsidyAmount * subsidyDistribution.savings),
        cryptoCore: roundCurrency(subsidyAmount * subsidyDistribution.core),
        shitMoney: roundCurrency(subsidyAmount * subsidyDistribution.shit),
        leisure: roundCurrency(subsidyAmount * subsidyDistribution.fun),
      }
    : { ...ZERO_SUBSIDY_TARGETS };

  const combinedTargets = {
    savings: roundCurrency(baseTargets.savings + subsidyTargets.savings),
    cryptoCore: roundCurrency(baseTargets.cryptoCore + subsidyTargets.cryptoCore),
    shitMoney: roundCurrency(baseTargets.shitMoney + subsidyTargets.shitMoney),
    leisure: roundCurrency(baseTargets.leisure + subsidyTargets.leisure),
    buffer: baseTargets.buffer,
  };

  return {
    totalIncome: roundCurrency(totalIncome),
    incomeBase: roundCurrency(incomeBase),
    incomeMealCard: roundCurrency(incomeMealCard),
    incomeExtraordinary: includesSubsidyInExtra ? 0 : roundCurrency(incomeExtraordinary),
    incomeSubsidy: includesSubsidyInExtra ? roundCurrency(subsidyAmount) : 0,
    availableCash: roundCurrency(baseAvailable + (includesSubsidyInExtra ? subsidyAmount : 0)),
    baseAvailable: roundCurrency(baseAvailable),
    baseTargets,
    subsidyTargets,
    combinedTargets,
    mealCardBudget: roundCurrency(incomeMealCard),
    subsidyApplied: includesSubsidyInExtra,
  };
}

export function applyDistributionToMonth(month: Month): Month {
  const distribution = calculateMonthDistribution(month);

  return {
    ...month,
    subsidyApplied: distribution.subsidyApplied,
    subsidyAmount: distribution.subsidyApplied ? distribution.incomeSubsidy : 0,
    incomeExtraordinary: distribution.subsidyApplied ? 0 : distribution.incomeExtraordinary,
    availableCash: distribution.baseAvailable,
    plannedLeisure: distribution.combinedTargets.leisure,
    plannedShitMoney: distribution.combinedTargets.shitMoney,
    plannedSavings: distribution.combinedTargets.savings,
    plannedBuffer: distribution.combinedTargets.buffer,
    plannedCryptoCore: distribution.combinedTargets.cryptoCore,
    plannedCryptoShit: month.plannedCryptoShit ?? 0,
    lastInputsUpdatedAt: new Date(),
  };
}

export interface AccountBucketSnapshot {
  opening: number;
  inflow: number;
  outflow: number;
  current: number;
  plan: number;
  remainingPlan: number;
}

export interface BudgetBucketSnapshot {
  plan: number;
  actual: number;
  remaining: number;
}

export interface CryptoBucketSnapshot extends BudgetBucketSnapshot {
  corePlan: number;
  shitPlan: number;
  coreActual: number;
  shitActual: number;
}

export interface MonthBucketSummary {
  account: AccountBucketSnapshot;
  mealCard: AccountBucketSnapshot & { foodSpent: number };
  leisure: BudgetBucketSnapshot;
  shitMoney: BudgetBucketSnapshot;
  savings: BudgetBucketSnapshot;
  crypto: CryptoBucketSnapshot;
  buffer: BudgetBucketSnapshot;
}

export const EMPTY_BUCKET_SUMMARY: MonthBucketSummary = {
  account: {
    opening: 0,
    inflow: 0,
    outflow: 0,
    current: 0,
    plan: 0,
    remainingPlan: 0,
  },
  mealCard: {
    opening: 0,
    inflow: 0,
    outflow: 0,
    current: 0,
    plan: 0,
    remainingPlan: 0,
    foodSpent: 0,
  },
  leisure: { plan: 0, actual: 0, remaining: 0 },
  shitMoney: { plan: 0, actual: 0, remaining: 0 },
  savings: { plan: 0, actual: 0, remaining: 0 },
  crypto: {
    plan: 0,
    actual: 0,
    remaining: 0,
    corePlan: 0,
    shitPlan: 0,
    coreActual: 0,
    shitActual: 0,
  },
  buffer: { plan: 0, actual: 0, remaining: 0 },
};

const sumMovements = (movements: Movement[], predicate: (movement: Movement) => boolean) => {
  return roundCurrency(
    movements.reduce((total, movement) => {
      if (predicate(movement)) {
        return total + movement.amount;
      }
      return total;
    }, 0),
  );
};

const getAccountIdByType = (accounts: Account[], type: Account['type']) =>
  accounts.find((account) => account.type === type)?.id;

const getBalanceForAccount = (
  balances: AccountBalance[],
  accountId?: string,
): AccountBalance | undefined => balances.find((balance) => balance.accountId === accountId);

export function buildMonthBuckets(
  month: Month,
  movements: Movement[],
  accounts: Account[],
  balances: AccountBalance[],
): MonthBucketSummary {
  const distribution = calculateMonthDistribution(month);
  const expenses = calculateActualExpenses(movements);
  const transfers = calculateActualTransfers(movements);

  const currentAccountId = getAccountIdByType(accounts, 'current');
  const mealCardAccountId = getAccountIdByType(accounts, 'mealCard');

  const accountOutflow = (accountId?: string) =>
    accountId
      ? sumMovements(
          movements,
          (movement) =>
            movement.accountFromId === accountId && (movement.type === 'expense' || movement.type === 'transfer'),
        )
      : 0;

  const accountInflow = (accountId?: string) =>
    accountId
      ? sumMovements(
          movements,
          (movement) =>
            movement.accountToId === accountId && (movement.type === 'income' || movement.type === 'transfer'),
        )
      : 0;

  const buildAccountBucket = (accountId: string | undefined, plan: number): AccountBucketSnapshot => {
    const balance = getBalanceForAccount(balances, accountId);
    const opening = balance?.openingBalance ?? 0;
    const inflow = accountInflow(accountId);
    const outflow = accountOutflow(accountId);
    const current = roundCurrency(opening + inflow - outflow);
    const remainingPlan = roundCurrency(plan - outflow);

    return {
      opening: roundCurrency(opening),
      inflow,
      outflow,
      current,
      plan: roundCurrency(plan),
      remainingPlan,
    };
  };

  const accountBucket = buildAccountBucket(currentAccountId, distribution.availableCash);
  const mealCardBucket = {
    ...buildAccountBucket(mealCardAccountId, distribution.mealCardBudget),
    foodSpent: accountOutflow(mealCardAccountId),
  };

  const savingsPlan = distribution.combinedTargets.savings;
  const savingsActual = transfers.transferenciaPoupanca ?? 0;
  const shitMoneyPlan = distribution.combinedTargets.shitMoney;
  const shitMoneyActual = expenses.shitMoney ?? 0;
  const leisurePlan = distribution.combinedTargets.leisure;
  const leisureActual = expenses.leisure ?? 0;
  const bufferPlan = distribution.combinedTargets.buffer;
  const bufferActual = transfers.buffer ?? 0;
  const cryptoCorePlan = distribution.combinedTargets.cryptoCore;
  const cryptoShitPlan = month.plannedCryptoShit ?? 0;
  const cryptoActualCore = transfers.compraCryptoCore ?? 0;
  const cryptoActualShit = transfers.compraCryptoShit ?? 0;

  const buildBudgetBucket = (plan: number, actual: number): BudgetBucketSnapshot => ({
    plan: roundCurrency(plan),
    actual: roundCurrency(actual),
    remaining: roundCurrency(plan - actual),
  });

  return {
    account: accountBucket,
    mealCard: mealCardBucket,
    leisure: buildBudgetBucket(leisurePlan, leisureActual),
    shitMoney: buildBudgetBucket(shitMoneyPlan, shitMoneyActual),
    savings: buildBudgetBucket(savingsPlan, savingsActual),
    buffer: buildBudgetBucket(bufferPlan, bufferActual),
    crypto: {
      plan: roundCurrency(cryptoCorePlan + cryptoShitPlan),
      actual: roundCurrency(cryptoActualCore + cryptoActualShit),
      remaining: roundCurrency(cryptoCorePlan + cryptoShitPlan - (cryptoActualCore + cryptoActualShit)),
      corePlan: roundCurrency(cryptoCorePlan),
      shitPlan: roundCurrency(cryptoShitPlan),
      coreActual: roundCurrency(cryptoActualCore),
      shitActual: roundCurrency(cryptoActualShit),
    },
  };
}

export type SuggestionTone = 'info' | 'warning' | 'success';

export interface SavingsSuggestion {
  id: string;
  tone: SuggestionTone;
  message: string;
}

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export function generateSavingsSuggestions(
  month: Month,
  buckets: MonthBucketSummary,
  now: Date = new Date(),
): SavingsSuggestion[] {
  const suggestions: SavingsSuggestion[] = [];

  const totalDays = daysInMonth(month.year, month.month);
  const halfwayPoint = Math.floor(totalDays / 2);
  const currentDay = month.year === now.getFullYear() && month.month === now.getMonth() + 1 ? now.getDate() : totalDays;

  const leisurePlan = buckets.leisure.plan;
  if (leisurePlan > 0) {
    const leisureUsage = buckets.leisure.actual / leisurePlan;
    if (leisureUsage >= 0.8 && currentDay <= halfwayPoint) {
      suggestions.push({
        id: 'leisure-brake',
        tone: 'warning',
        message: 'Abranda no lazer esta semana para manteres o plano do mês.',
      });
    }
  }

  if (currentDay >= 20 && buckets.savings.plan > 0) {
    const savingsProgress = buckets.savings.actual / buckets.savings.plan;
    if (savingsProgress < 0.5) {
      const missing = Math.max(buckets.savings.plan * 0.5 - buckets.savings.actual, 0);
      suggestions.push({
        id: 'savings-transfer',
        tone: 'warning',
        message: `Faz transferência de ${formatCurrency(roundCurrency(missing))} para a poupança hoje.`,
      });
    }
  }

  if (buckets.mealCard.remainingPlan <= 0 && currentDay < totalDays) {
    suggestions.push({
      id: 'meal-card-empty',
      tone: 'warning',
      message: 'O cartão refeição já foi todo. Usa saldo da conta e reduz lazer para compensar.',
    });
  }

  if (buckets.shitMoney.actual >= buckets.shitMoney.plan && buckets.shitMoney.plan > 0) {
    suggestions.push({
      id: 'risky-budget-done',
      tone: 'info',
      message: 'Já cumpriste a parte de risco deste mês. Evita novos gastos em shit money.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'on-track',
      tone: 'success',
      message: 'Ótimo! O plano está alinhado com o mês. Continua assim.',
    });
  }

  return suggestions;
}

export function calculatePlannedIncome(month: Month): Record<IncomeCategoryKey, number> {
  return {
    incomeSalary: month.incomeBase ?? 0,
    incomeSubsidy: isSubsidyMonth(month) ? month.subsidyAmount ?? 0 : 0,
    incomeMealCard: month.incomeMealCard ?? 0,
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
  const openingBalance = month.incomeMealCard ?? 0;
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
