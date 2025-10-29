import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { MovementDialog } from "@/components/MovementDialog";
import { CardFundingDialog } from "@/components/CardFundingDialog";
import { getDB, initializeDefaultData, Month, Account, AccountBalance, Movement, AppSettings } from "@/lib/db";
import {
  calculatePlannedIncome,
  calculateActualIncome,
  calculatePlannedExpenses,
  calculateActualExpenses,
  calculatePlannedTransfers,
  calculateActualTransfers,
  calculatePlannedAvailable,
  calculatePlannedIncomeTotal,
  calculatePlannedOutflows,
  calculateSavingsProgress,
  calculateEssentialShare,
  calculateFunShare,
  calculateCryptoShare,
  calculateFixedVsVariable,
  calculateCashFlow,
  sumRecord,
  isSubsidyMonth,
} from "@/lib/calculations";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Month | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementDialogType, setMovementDialogType] = useState<'expense' | 'transfer' | 'income'>('expense');
  const [cardFundingDialogOpen, setCardFundingDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      await initializeDefaultData();
      const db = await getDB();

      // Load settings
      const loadedSettings = await db.get('settings', 'default');
      const safeSettings = loadedSettings
        ? {
            ...loadedSettings,
            monthlyMealCardBalance: loadedSettings.monthlyMealCardBalance ?? 0,
            monthlyCreditCardBalance: loadedSettings.monthlyCreditCardBalance ?? 0,
            monthlyExtraordinaryIncome: loadedSettings.monthlyExtraordinaryIncome ?? 0,
            rentPlanned: loadedSettings.rentPlanned ?? 0,
            utilitiesPlanned: loadedSettings.utilitiesPlanned ?? 0,
            foodPlannedMonthly: loadedSettings.foodPlannedMonthly ?? loadedSettings.foodPlanned ?? 0,
            leisurePlanned: loadedSettings.leisurePlanned ?? 0,
            shitMoneyPlanned: loadedSettings.shitMoneyPlanned ?? 0,
            transportPlanned: loadedSettings.transportPlanned ?? 0,
            healthPlanned: loadedSettings.healthPlanned ?? 0,
            shoppingPlanned: loadedSettings.shoppingPlanned ?? 0,
            subscriptionsPlanned: loadedSettings.subscriptionsPlanned ?? 0,
            bufferPlanned: loadedSettings.bufferPlanned ?? 0,
            savingsPlanned: loadedSettings.savingsPlanned ?? 0,
            cryptoCorePlanned: loadedSettings.cryptoCorePlanned ?? 0,
            cryptoShitPlanned: loadedSettings.cryptoShitPlanned ?? 0,
          }
        : null;
      setSettings(safeSettings);

      // Load accounts
      const loadedAccounts = await db.getAll('accounts');
      setAccounts(loadedAccounts);

      // Get or create current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let monthData = await db.getFromIndex('months', 'by-year-month', [year, month]);
      
      if (!monthData && safeSettings) {
        // Create new month from settings
        monthData = {
          id: crypto.randomUUID(),
          year,
          month,
          isClosed: false,
          incomeBase: safeSettings.monthlyIncomeBase,
          incomeMealCard: safeSettings.monthlyMealCardBalance,
          incomeCreditCard: safeSettings.monthlyCreditCardBalance,
          incomeExtraordinary: safeSettings.monthlyExtraordinaryIncome,
          fixedExpenses: safeSettings.fixedExpenses,
          foodSeparate: safeSettings.foodSeparate,
          foodPlanned: safeSettings.foodPlanned,
          subsidyApplied: false,
          subsidyAmount: safeSettings.subsidyAmount,
          plannedRent: safeSettings.rentPlanned,
          plannedUtilities: safeSettings.utilitiesPlanned,
          plannedFood: safeSettings.foodPlannedMonthly,
          plannedLeisure: safeSettings.leisurePlanned,
          plannedShitMoney: safeSettings.shitMoneyPlanned,
          plannedTransport: safeSettings.transportPlanned,
          plannedHealth: safeSettings.healthPlanned,
          plannedShopping: safeSettings.shoppingPlanned,
          plannedSubscriptions: safeSettings.subscriptionsPlanned,
          plannedBuffer: safeSettings.bufferPlanned,
          plannedSavings: safeSettings.savingsPlanned,
          plannedCryptoCore: safeSettings.cryptoCorePlanned,
          plannedCryptoShit: safeSettings.cryptoShitPlanned,
          distributionCore: safeSettings.distributionDefaultCore,
          distributionShit: safeSettings.distributionDefaultShit,
          distributionSavings: safeSettings.distributionDefaultSavings,
          distributionFun: safeSettings.distributionDefaultFun,
          distributionBuffer: safeSettings.distributionDefaultBuffer,
        };
        await db.put('months', monthData);

        // Create initial balances
        for (const account of loadedAccounts) {
          const balance: AccountBalance = {
            id: crypto.randomUUID(),
            accountId: account.id,
            forMonthYear: year,
            forMonthMonth: month,
            openingBalance: 0,
            manualCurrentBalance: 0,
          };
          await db.put('balances', balance);
        }

        const accountsByType = loadedAccounts.reduce<Record<string, string>>((acc, account) => {
          acc[account.type] = account.id;
          return acc;
        }, {});

        const defaultAccountId = accountsByType['current'] || loadedAccounts[0]?.id;
        const incomeDate = new Date(year, month - 1, Math.min(safeSettings.paydayDayOfMonth || 1, 28));

        const movementsToSeed: Movement[] = [];

        if (safeSettings.monthlyIncomeBase > 0 && defaultAccountId) {
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: incomeDate,
            type: 'income',
            amount: safeSettings.monthlyIncomeBase,
            category: 'incomeSalary',
            accountToId: defaultAccountId,
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        }

        if (safeSettings.monthlyMealCardBalance > 0 && accountsByType['mealCard']) {
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, 1),
            type: 'income',
            amount: safeSettings.monthlyMealCardBalance,
            category: 'incomeMealCard',
            accountToId: accountsByType['mealCard'],
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        }

        if (safeSettings.monthlyCreditCardBalance > 0 && accountsByType['creditCard']) {
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, 1),
            type: 'income',
            amount: safeSettings.monthlyCreditCardBalance,
            category: 'incomeCreditCard',
            accountToId: accountsByType['creditCard'],
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        }

        const creditCardAccountId = accountsByType['creditCard'];
        const pushExpenseFromCredit = (
          category: 'rent' | 'shitMoney',
          amount: number,
          day: number,
        ) => {
          if (!creditCardAccountId || amount <= 0) return;
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, day),
            type: 'expense',
            amount,
            category,
            accountFromId: creditCardAccountId,
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        };

        pushExpenseFromCredit('rent', safeSettings.rentPlanned ?? 0, 2);
        pushExpenseFromCredit('shitMoney', safeSettings.shitMoneyPlanned ?? 0, 3);

        const pushTransferFromCredit = (
          category: 'transferenciaPoupanca' | 'compraCryptoCore' | 'compraCryptoShit',
          amount: number,
          targetType: 'savings' | 'cryptoCore' | 'cryptoShit',
          day: number,
        ) => {
          if (!creditCardAccountId || amount <= 0) return;
          const accountToId = accountsByType[targetType];
          if (!accountToId) return;

          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, day),
            type: 'transfer',
            amount,
            category,
            accountFromId: creditCardAccountId,
            accountToId,
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        };

        pushTransferFromCredit('transferenciaPoupanca', safeSettings.savingsPlanned ?? 0, 'savings', 4);
        pushTransferFromCredit('compraCryptoCore', safeSettings.cryptoCorePlanned ?? 0, 'cryptoCore', 5);
        pushTransferFromCredit('compraCryptoShit', safeSettings.cryptoShitPlanned ?? 0, 'cryptoShit', 6);

        if (isSubsidyMonth(monthData) && safeSettings.subsidyAmount > 0 && defaultAccountId) {
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, 15),
            type: 'income',
            amount: safeSettings.subsidyAmount,
            category: 'incomeSubsidy',
            accountToId: defaultAccountId,
            isSubsidyTagged: true,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        }

        if (safeSettings.monthlyExtraordinaryIncome > 0 && defaultAccountId) {
          movementsToSeed.push({
            id: crypto.randomUUID(),
            date: new Date(year, month - 1, 20),
            type: 'income',
            amount: safeSettings.monthlyExtraordinaryIncome,
            category: 'incomeExtraordinary',
            accountToId: defaultAccountId,
            isSubsidyTagged: false,
            monthYear: year,
            monthMonth: month,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Movement);
        }

        for (const movement of movementsToSeed) {
          await db.put('movements', movement);
        }
      }

      const hydratedMonth = monthData
        ? {
            ...monthData,
            incomeMealCard: monthData.incomeMealCard ?? 0,
            incomeCreditCard: monthData.incomeCreditCard ?? 0,
            incomeExtraordinary: monthData.incomeExtraordinary ?? 0,
            plannedRent: monthData.plannedRent ?? monthData.fixedExpenses ?? 0,
            plannedUtilities: monthData.plannedUtilities ?? 0,
            plannedFood: monthData.plannedFood ?? monthData.foodPlanned ?? 0,
            plannedLeisure: monthData.plannedLeisure ?? 0,
            plannedShitMoney: monthData.plannedShitMoney ?? 0,
            plannedTransport: monthData.plannedTransport ?? 0,
            plannedHealth: monthData.plannedHealth ?? 0,
            plannedShopping: monthData.plannedShopping ?? 0,
            plannedSubscriptions: monthData.plannedSubscriptions ?? 0,
            plannedBuffer: monthData.plannedBuffer ?? 0,
            plannedSavings: monthData.plannedSavings ?? 0,
            plannedCryptoCore: monthData.plannedCryptoCore ?? 0,
            plannedCryptoShit: monthData.plannedCryptoShit ?? 0,
          }
        : null;

      setCurrentMonth(hydratedMonth);

      // Load balances for current month
      const loadedBalances = await db.getAllFromIndex('balances', 'by-month', [year, month]);
      setBalances(loadedBalances);

      // Load movements for current month
      const loadedMovements = await db.getAllFromIndex('movements', 'by-month', [year, month]);
      setMovements(loadedMovements);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
    }
  }

  if (isLoading || !currentMonth || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  const monthName = format(new Date(currentMonth.year, currentMonth.month - 1), "MMMM yyyy", { locale: pt });

  const plannedIncome = calculatePlannedIncome(currentMonth);
  const actualIncome = calculateActualIncome(movements);
  const plannedExpenses = calculatePlannedExpenses(currentMonth);
  const actualExpenses = calculateActualExpenses(movements);
  const plannedTransfers = calculatePlannedTransfers(currentMonth);
  const actualTransfers = calculateActualTransfers(movements);
  const savingsProgress = calculateSavingsProgress(currentMonth, movements);
  const essentialShare = calculateEssentialShare(movements, currentMonth);
  const funShare = calculateFunShare(movements, currentMonth);
  const cryptoShare = calculateCryptoShare(movements, currentMonth);
  const fixedVsVariable = calculateFixedVsVariable(movements);
  const cashFlow = calculateCashFlow(currentMonth, movements);

  const dashboardBalances = accounts.map(account => {
    const balance = balances.find(b => b.accountId === account.id);
    return {
      name: account.name,
      balance: balance?.manualCurrentBalance || 0,
      type: account.type,
    };
  });

  const summary = {
    openingBalance: (currentMonth.incomeMealCard ?? 0) + (currentMonth.incomeCreditCard ?? 0),
    plannedIncomeTotal: calculatePlannedIncomeTotal(currentMonth),
    plannedOutflowTotal: calculatePlannedOutflows(currentMonth),
    plannedAvailable: calculatePlannedAvailable(currentMonth),
    actualIncomeTotal: sumRecord(actualIncome),
    actualExpenseTotal: sumRecord(actualExpenses),
    actualTransferTotal: sumRecord(actualTransfers),
    cashFlow,
    savingsPlanned: plannedTransfers.transferenciaPoupanca ?? 0,
    savingsActual: actualTransfers.transferenciaPoupanca ?? 0,
    savingsProgress,
    essentialShare,
    funShare,
    cryptoShare,
    fixedExpenses: fixedVsVariable.fixed,
    variableExpenses: fixedVsVariable.variable,
  };

  async function handleSaveMovement(movement: Partial<Movement>) {
    try {
      const db = await getDB();
      const newMovement: Movement = {
        id: crypto.randomUUID(),
        ...movement,
      } as Movement;

      await db.put('movements', newMovement);
      setMovements([...movements, newMovement]);

      toast({
        title: "Movimento adicionado",
        description: "O movimento foi registado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o movimento",
        variant: "destructive",
      });
    }
  }

  async function handleSaveCardFunding(values: { mealCard: number; creditCard: number }) {
    if (!currentMonth) return;

    try {
      const db = await getDB();
      const updatedMonth: Month = {
        ...currentMonth,
        incomeMealCard: values.mealCard,
        incomeCreditCard: values.creditCard,
      };

      await db.put('months', updatedMonth);
      setCurrentMonth(updatedMonth);

      const accountsByType = accounts.reduce<Record<string, string>>((acc, account) => {
        acc[account.type] = account.id;
        return acc;
      }, {} as Record<string, string>);

      const cardIncomeDate = new Date(updatedMonth.year, updatedMonth.month - 1, 1);

      const upsertIncomeMovement = async (
        category: 'incomeMealCard' | 'incomeCreditCard',
        amount: number,
        accountToId?: string,
      ) => {
        const existing = movements.find(
          movement =>
            movement.type === 'income' &&
            movement.category === category &&
            movement.monthYear === updatedMonth.year &&
            movement.monthMonth === updatedMonth.month,
        );

        if (!accountToId) {
          if (existing) {
            await db.delete('movements', existing.id);
          }
          return;
        }

        if (amount > 0) {
          if (existing) {
            await db.put('movements', {
              ...existing,
              amount,
              accountToId,
              date: existing.date ?? cardIncomeDate,
              updatedAt: new Date(),
            });
          } else {
            const newMovement: Movement = {
              id: crypto.randomUUID(),
              date: cardIncomeDate,
              type: 'income',
              amount,
              category,
              accountToId,
              isSubsidyTagged: false,
              monthYear: updatedMonth.year,
              monthMonth: updatedMonth.month,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await db.put('movements', newMovement);
          }
        } else if (existing) {
          await db.delete('movements', existing.id);
        }
      };

      await upsertIncomeMovement('incomeMealCard', values.mealCard, accountsByType['mealCard']);
      await upsertIncomeMovement('incomeCreditCard', values.creditCard, accountsByType['creditCard']);

      const refreshedMovements = await db.getAllFromIndex('movements', 'by-month', [updatedMonth.year, updatedMonth.month]);
      setMovements(refreshedMovements);

      toast({
        title: "Cartões atualizados",
        description: "Os valores foram registados para este mês.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os cartões.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dashboard
        monthName={monthName}
        summary={summary}
        incomePlan={plannedIncome}
        incomeActual={actualIncome}
        expensePlan={plannedExpenses}
        expenseActual={actualExpenses}
        transferPlan={plannedTransfers}
        transferActual={actualTransfers}
        balances={dashboardBalances}
        isClosed={currentMonth.isClosed}
        onAddIncome={() => {
          setMovementDialogType('income');
          setMovementDialogOpen(true);
        }}
        onAddExpense={() => {
          setMovementDialogType('expense');
          setMovementDialogOpen(true);
        }}
        onAddTransfer={() => {
          setMovementDialogType('transfer');
          setMovementDialogOpen(true);
        }}
        onManageCardFunding={() => setCardFundingDialogOpen(true)}
        onCloseMonth={() => {
          toast({
            title: "Fechar mês",
            description: "Funcionalidade em desenvolvimento",
          });
        }}
      />
      
      <MovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
        type={movementDialogType}
        accounts={accounts}
        onSave={handleSaveMovement}
      />

      <CardFundingDialog
        open={cardFundingDialogOpen}
        onOpenChange={setCardFundingDialogOpen}
        defaultMealAmount={currentMonth.incomeMealCard ?? 0}
        defaultCreditAmount={currentMonth.incomeCreditCard ?? 0}
        onSave={handleSaveCardFunding}
      />
    </>
  );
};

export default Index;
