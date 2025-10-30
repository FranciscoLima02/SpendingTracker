// IndexedDB setup for offline-first storage
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { generateId } from './id';

export interface AppSettings {
  id: string;
  baseCurrency: string;
  monthlyIncomeBase: number;
  monthlyMealCardBalance: number;
  monthlyExtraordinaryIncome: number;
  fixedExpenses: number;
  foodSeparate: boolean;
  foodPlanned: number;
  subsidyAmount: number;
  paydayDayOfMonth: number;
  rentPlanned: number;
  utilitiesPlanned: number;
  foodPlannedMonthly: number;
  leisurePlanned: number;
  shitMoneyPlanned: number;
  transportPlanned: number;
  healthPlanned: number;
  shoppingPlanned: number;
  subscriptionsPlanned: number;
  bufferPlanned: number;
  savingsPlanned: number;
  cryptoCorePlanned: number;
  cryptoShitPlanned: number;
  distributionDefaultCore: number;
  distributionDefaultShit: number;
  distributionDefaultSavings: number;
  distributionDefaultFun: number;
  distributionDefaultBuffer: number;
  distributionSubsidySavings: number;
  distributionSubsidyCore: number;
  distributionSubsidyShit: number;
  distributionSubsidyFun: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Month {
  id: string;
  year: number;
  month: number;
  isClosed: boolean;
  closedAt?: Date;
  incomeBase: number;
  incomeMealCard: number;
  incomeExtraordinary: number;
  subsidyDistributionSavings?: number;
  subsidyDistributionCore?: number;
  subsidyDistributionShit?: number;
  subsidyDistributionFun?: number;
  fixedExpenses: number;
  foodSeparate: boolean;
  foodPlanned: number;
  subsidyApplied: boolean;
  subsidyAmount: number;
  actualFixedExpenses?: number;
  actualFoodExpenses?: number;
  availableCash?: number;
  lastInputsUpdatedAt?: Date;
  plannedRent: number;
  plannedUtilities: number;
  plannedFood: number;
  plannedLeisure: number;
  plannedShitMoney: number;
  plannedTransport: number;
  plannedHealth: number;
  plannedShopping: number;
  plannedSubscriptions: number;
  plannedBuffer: number;
  plannedSavings: number;
  plannedCryptoCore: number;
  plannedCryptoShit: number;
  distributionCore: number;
  distributionShit: number;
  distributionSavings: number;
  distributionFun: number;
  distributionBuffer: number;
}

export interface Account {
  id: string;
  type: 'current' | 'mealCard' | 'savings' | 'cryptoCore' | 'cryptoShit';
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalance {
  id: string;
  accountId: string;
  forMonthYear: number;
  forMonthMonth: number;
  openingBalance: number;
  manualCurrentBalance: number;
}

export interface Movement {
  id: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  accountFromId?: string;
  accountToId?: string;
  note?: string;
  isSubsidyTagged: boolean;
  monthYear: number;
  monthMonth: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FinanceDB extends DBSchema {
  settings: {
    key: string;
    value: AppSettings;
  };
  months: {
    key: string;
    value: Month;
    indexes: { 'by-year-month': [number, number] };
  };
  accounts: {
    key: string;
    value: Account;
  };
  balances: {
    key: string;
    value: AccountBalance;
    indexes: { 'by-account': string; 'by-month': [number, number] };
  };
  movements: {
    key: string;
    value: Movement;
    indexes: { 'by-month': [number, number]; 'by-date': Date };
  };
}

let dbInstance: IDBPDatabase<FinanceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FinanceDB>('finance-app', 1, {
    upgrade(db) {
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Months store
      if (!db.objectStoreNames.contains('months')) {
        const monthStore = db.createObjectStore('months', { keyPath: 'id' });
        monthStore.createIndex('by-year-month', ['year', 'month']);
      }

      // Accounts store
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }

      // Balances store
      if (!db.objectStoreNames.contains('balances')) {
        const balanceStore = db.createObjectStore('balances', { keyPath: 'id' });
        balanceStore.createIndex('by-account', 'accountId');
        balanceStore.createIndex('by-month', ['forMonthYear', 'forMonthMonth']);
      }

      // Movements store
      if (!db.objectStoreNames.contains('movements')) {
        const movementStore = db.createObjectStore('movements', { keyPath: 'id' });
        movementStore.createIndex('by-month', ['monthYear', 'monthMonth']);
        movementStore.createIndex('by-date', 'date');
      }
    },
  });

  return dbInstance;
}

// Initialize default data
export async function initializeDefaultData() {
  const db = await getDB();

  // Default blueprint used to backfill missing settings fields
  const rentPlanned = 200;
  const utilitiesPlanned = 75;
  const subscriptionsPlanned = 35;

  const defaultSettings: AppSettings = {
    id: 'default',
    baseCurrency: 'EUR',
    monthlyIncomeBase: 1168,
    monthlyMealCardBalance: 210,
    monthlyExtraordinaryIncome: 0,
    fixedExpenses: rentPlanned + utilitiesPlanned + subscriptionsPlanned,
    foodSeparate: false,
    foodPlanned: 0,
    subsidyAmount: 934,
    paydayDayOfMonth: 30,
    rentPlanned,
    utilitiesPlanned,
    foodPlannedMonthly: 350,
    leisurePlanned: 120,
    shitMoneyPlanned: 80,
    transportPlanned: 60,
    healthPlanned: 40,
    shoppingPlanned: 50,
    subscriptionsPlanned,
    bufferPlanned: 60,
    savingsPlanned: 200,
    cryptoCorePlanned: 100,
    cryptoShitPlanned: 50,
    distributionDefaultCore: 0.25,
    distributionDefaultShit: 0.1,
    distributionDefaultSavings: 0.25,
    distributionDefaultFun: 0.25,
    distributionDefaultBuffer: 0.15,
    distributionSubsidySavings: 0.35,
    distributionSubsidyCore: 0.3,
    distributionSubsidyShit: 0.1,
    distributionSubsidyFun: 0.25,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingSettings = await db.get('settings', 'default');

  if (!existingSettings) {
    await db.put('settings', defaultSettings);
  } else {
    const patchedSettings: AppSettings = {
      ...existingSettings,
      createdAt: existingSettings.createdAt ? new Date(existingSettings.createdAt) : new Date(),
      updatedAt: new Date(),
    } as AppSettings;

    let needsUpdate = false;
    (Object.keys(defaultSettings) as (keyof AppSettings)[]).forEach((key) => {
      if (patchedSettings[key] === undefined || patchedSettings[key] === null) {
        patchedSettings[key] = defaultSettings[key];
        needsUpdate = true;
      }
    });

    if (!needsUpdate) {
      // keep original updatedAt when nothing changed
      patchedSettings.updatedAt = existingSettings.updatedAt
        ? new Date(existingSettings.updatedAt)
        : patchedSettings.updatedAt;
    }

    if (needsUpdate) {
      await db.put('settings', patchedSettings);
    }
  }

  const existingAccounts = await db.getAll('accounts');
  const requiredAccounts: Array<Pick<Account, 'type' | 'name'>> = [
    { type: 'current', name: 'Conta' },
    { type: 'mealCard', name: 'Cartão Refeição' },
    { type: 'savings', name: 'Poupança' },
    { type: 'cryptoCore', name: 'Crypto Core' },
    { type: 'cryptoShit', name: 'Crypto Shit' },
  ];

  const existingTypes = new Set(existingAccounts.map((account) => account.type));
  const missingAccounts = requiredAccounts.filter((definition) => !existingTypes.has(definition.type));

  if (missingAccounts.length > 0) {
    for (const definition of missingAccounts) {
      const account: Account = {
        id: generateId(),
        type: definition.type,
        name: definition.name,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.put('accounts', account);
    }
  }
}

interface CreateMonthOverrides {
  incomeBase?: number;
  mealCard?: number;
  extraordinaryIncome?: number;
}

export interface CreateMonthOptions {
  year: number;
  month: number;
  settings: AppSettings;
  accounts: Account[];
  previousBalances?: AccountBalance[];
  overrides?: CreateMonthOverrides;
}

export async function createMonthWithDefaults({
  year,
  month,
  settings,
  accounts,
  previousBalances,
  overrides,
}: CreateMonthOptions): Promise<Month> {
  const db = await getDB();

  const incomeBase = overrides?.incomeBase ?? settings.monthlyIncomeBase ?? 0;
  const incomeMealCard = overrides?.mealCard ?? settings.monthlyMealCardBalance ?? 0;
  const incomeExtraordinary = overrides?.extraordinaryIncome ?? settings.monthlyExtraordinaryIncome ?? 0;

  const monthRecord: Month = {
    id: generateId(),
    year,
    month,
    isClosed: false,
    incomeBase,
    incomeMealCard,
    incomeExtraordinary,
    subsidyDistributionSavings: settings.distributionSubsidySavings ?? 0,
    subsidyDistributionCore: settings.distributionSubsidyCore ?? 0,
    subsidyDistributionShit: settings.distributionSubsidyShit ?? 0,
    subsidyDistributionFun: settings.distributionSubsidyFun ?? 0,
    fixedExpenses: settings.fixedExpenses ?? 0,
    foodSeparate: settings.foodSeparate ?? false,
    foodPlanned: settings.foodPlanned ?? 0,
    subsidyApplied: false,
    subsidyAmount: settings.subsidyAmount ?? 0,
    actualFixedExpenses: 0,
    actualFoodExpenses: 0,
    availableCash: 0,
    plannedRent: settings.rentPlanned ?? settings.fixedExpenses ?? 0,
    plannedUtilities: settings.utilitiesPlanned ?? 0,
    plannedFood: settings.foodPlannedMonthly ?? settings.foodPlanned ?? 0,
    plannedLeisure: settings.leisurePlanned ?? 0,
    plannedShitMoney: settings.shitMoneyPlanned ?? 0,
    plannedTransport: settings.transportPlanned ?? 0,
    plannedHealth: settings.healthPlanned ?? 0,
    plannedShopping: settings.shoppingPlanned ?? 0,
    plannedSubscriptions: settings.subscriptionsPlanned ?? 0,
    plannedBuffer: settings.bufferPlanned ?? 0,
    plannedSavings: settings.savingsPlanned ?? 0,
    plannedCryptoCore: settings.cryptoCorePlanned ?? 0,
    plannedCryptoShit: settings.cryptoShitPlanned ?? 0,
    distributionCore: settings.distributionDefaultCore ?? 0,
    distributionShit: settings.distributionDefaultShit ?? 0,
    distributionSavings: settings.distributionDefaultSavings ?? 0,
    distributionFun: settings.distributionDefaultFun ?? 0,
    distributionBuffer: settings.distributionDefaultBuffer ?? 0,
  };

  await db.put('months', monthRecord);

  for (const account of accounts) {
    const previousBalance = previousBalances?.find((balance) => balance.accountId === account.id);
    const openingBalance = previousBalance?.manualCurrentBalance ?? previousBalance?.openingBalance ?? 0;

    const balance: AccountBalance = {
      id: generateId(),
      accountId: account.id,
      forMonthYear: year,
      forMonthMonth: month,
      openingBalance,
      manualCurrentBalance: openingBalance,
    };

    await db.put('balances', balance);
  }

  const accountsByType = accounts.reduce<
    Record<Account['type'], string | undefined>
  >(
    (acc, account) => {
      acc[account.type] = account.id;
      return acc;
    },
    {
      current: undefined,
      mealCard: undefined,
      savings: undefined,
      cryptoCore: undefined,
      cryptoShit: undefined,
    },
  );

  const defaultAccountId = accountsByType['current'] ?? accounts[0]?.id;

  const payday = settings.paydayDayOfMonth ? Math.min(Math.max(settings.paydayDayOfMonth, 1), 28) : 1;
  const incomeDate = new Date(year, month - 1, payday);
  const baseMovementDates = {
    mealCard: new Date(year, month - 1, 1),
    extraordinary: new Date(year, month - 1, 20),
    rent: new Date(year, month - 1, 2),
    shitMoney: new Date(year, month - 1, 3),
    savings: new Date(year, month - 1, 4),
    cryptoCore: new Date(year, month - 1, 5),
    cryptoShit: new Date(year, month - 1, 6),
    subsidy: new Date(year, month - 1, 15),
  } as const;

  const movements: Movement[] = [];

  if (incomeBase > 0 && defaultAccountId) {
    movements.push({
      id: generateId(),
      date: incomeDate,
      type: 'income',
      amount: incomeBase,
      category: 'incomeSalary',
      accountToId: defaultAccountId,
      isSubsidyTagged: false,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (incomeMealCard > 0 && accountsByType['mealCard']) {
    movements.push({
      id: generateId(),
      date: baseMovementDates.mealCard,
      type: 'income',
      amount: incomeMealCard,
      category: 'incomeMealCard',
      accountToId: accountsByType['mealCard'],
      isSubsidyTagged: false,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (incomeExtraordinary > 0 && defaultAccountId) {
    movements.push({
      id: generateId(),
      date: baseMovementDates.extraordinary,
      type: 'income',
      amount: incomeExtraordinary,
      category: 'incomeExtraordinary',
      accountToId: defaultAccountId,
      isSubsidyTagged: false,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const isSubsidyMonth = month === 6 || month === 12;
  if (isSubsidyMonth && settings.subsidyAmount > 0 && defaultAccountId) {
    movements.push({
      id: generateId(),
      date: baseMovementDates.subsidy,
      type: 'income',
      amount: settings.subsidyAmount,
      category: 'incomeSubsidy',
      accountToId: defaultAccountId,
      isSubsidyTagged: true,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const pushBaseExpense = (category: 'rent' | 'shitMoney', amount: number, date: Date) => {
    if (!defaultAccountId || amount <= 0) return;
    movements.push({
      id: generateId(),
      date,
      type: 'expense',
      amount,
      category,
      accountFromId: defaultAccountId,
      isSubsidyTagged: false,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  pushBaseExpense('rent', settings.rentPlanned ?? 0, baseMovementDates.rent);
  pushBaseExpense('shitMoney', settings.shitMoneyPlanned ?? 0, baseMovementDates.shitMoney);

  const pushBaseTransfer = (
    category: 'transferenciaPoupanca' | 'compraCryptoCore' | 'compraCryptoShit',
    amount: number,
    targetType: 'savings' | 'cryptoCore' | 'cryptoShit',
    date: Date,
  ) => {
    if (!defaultAccountId || amount <= 0) return;
    const accountToId = accountsByType[targetType];
    if (!accountToId) return;

    movements.push({
      id: generateId(),
      date,
      type: 'transfer',
      amount,
      category,
      accountFromId: defaultAccountId,
      accountToId,
      isSubsidyTagged: false,
      monthYear: year,
      monthMonth: month,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  pushBaseTransfer('transferenciaPoupanca', settings.savingsPlanned ?? 0, 'savings', baseMovementDates.savings);
  pushBaseTransfer('compraCryptoCore', settings.cryptoCorePlanned ?? 0, 'cryptoCore', baseMovementDates.cryptoCore);
  pushBaseTransfer('compraCryptoShit', settings.cryptoShitPlanned ?? 0, 'cryptoShit', baseMovementDates.cryptoShit);

  for (const movement of movements) {
    await db.put('movements', movement);
  }

  return monthRecord;
}
