// IndexedDB setup for offline-first storage
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface AppSettings {
  id: string;
  baseCurrency: string;
  monthlyIncomeBase: number;
  fixedExpenses: number;
  foodSeparate: boolean;
  foodPlanned: number;
  subsidyAmount: number;
  paydayDayOfMonth: number;
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
  fixedExpenses: number;
  foodSeparate: boolean;
  foodPlanned: number;
  subsidyApplied: boolean;
  subsidyAmount: number;
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
  
  // Check if settings exist
  const existingSettings = await db.get('settings', 'default');
  if (existingSettings) return;

  // Create default settings
  const defaultSettings: AppSettings = {
    id: 'default',
    baseCurrency: 'EUR',
    monthlyIncomeBase: 1168,
    fixedExpenses: 480,
    foodSeparate: false,
    foodPlanned: 0,
    subsidyAmount: 934,
    paydayDayOfMonth: 30,
    distributionDefaultCore: 0.25,
    distributionDefaultShit: 0.10,
    distributionDefaultSavings: 0.25,
    distributionDefaultFun: 0.25,
    distributionDefaultBuffer: 0.15,
    distributionSubsidySavings: 0.35,
    distributionSubsidyCore: 0.30,
    distributionSubsidyShit: 0.10,
    distributionSubsidyFun: 0.25,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.put('settings', defaultSettings);

  // Create default accounts
  const defaultAccounts: Account[] = [
    {
      id: crypto.randomUUID(),
      type: 'current',
      name: 'Conta',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      type: 'mealCard',
      name: 'Cartão Refeição',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      type: 'savings',
      name: 'Poupança',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      type: 'cryptoCore',
      name: 'Crypto Core',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      type: 'cryptoShit',
      name: 'Crypto Shit',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const account of defaultAccounts) {
    await db.put('accounts', account);
  }
}
