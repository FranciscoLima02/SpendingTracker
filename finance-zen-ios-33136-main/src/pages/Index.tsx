import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { MovementDialog } from "@/components/MovementDialog";
import { CardFundingDialog } from "@/components/CardFundingDialog";
import {
  getDB,
  initializeDefaultData,
  Month,
  Account,
  AccountBalance,
  Movement,
  AppSettings,
  createMonthWithDefaults,
} from "@/lib/db";
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
  applyDistributionToMonth,
  calculateMonthDistribution,
  buildMonthBuckets,
  generateSavingsSuggestions,
} from "@/lib/calculations";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const normalizeMonthData = (month: Month | null): Month | null => {
  if (!month) return null;

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
};

const getNextMonth = (year: number, month: number) => {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }

  return { year, month: month + 1 };
};

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
        monthData = await createMonthWithDefaults({
          year,
          month,
          settings: safeSettings,
          accounts: loadedAccounts,
        });
      }

      if (monthData && typeof monthData.availableCash === 'undefined') {
        const recalculated = applyDistributionToMonth(monthData);
        await db.put('months', recalculated);
        monthData = recalculated;
      }

      const hydratedMonth = normalizeMonthData(monthData);
      setCurrentMonth(hydratedMonth);

      if (!hydratedMonth) {
        setIsLoading(false);
        return;
      }

      // Load balances for current month
      const loadedBalances = await db.getAllFromIndex('balances', 'by-month', [hydratedMonth.year, hydratedMonth.month]);
      setBalances(loadedBalances);

      // Load movements for current month
      const loadedMovements = await db.getAllFromIndex('movements', 'by-month', [hydratedMonth.year, hydratedMonth.month]);
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

  const distribution = useMemo(() => calculateMonthDistribution(currentMonth), [currentMonth]);
  const bucketSummary = useMemo(
    () => buildMonthBuckets(currentMonth, movements, accounts, balances),
    [currentMonth, movements, accounts, balances],
  );
  const suggestions = useMemo(
    () => generateSavingsSuggestions(currentMonth, bucketSummary),
    [currentMonth, bucketSummary],
  );

  async function handleSaveMovement(movement: Partial<Movement>) {
    try {
      const db = await getDB();
      const newMovement: Movement = {
        id: crypto.randomUUID(),
        ...movement,
      } as Movement;

      await db.put('movements', newMovement);
      setMovements((prev) => [...prev, newMovement]);

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

      if (settings) {
        const updatedSettings: AppSettings = {
          ...settings,
          monthlyMealCardBalance: values.mealCard,
          monthlyCreditCardBalance: values.creditCard,
          updatedAt: new Date(),
        };

        await db.put('settings', updatedSettings);
        setSettings(updatedSettings);
      }

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

  async function handleCloseMonth() {
    if (!currentMonth || !settings) return;

    try {
      const db = await getDB();

      if (currentMonth.isClosed) {
        toast({
          title: "Mês já fechado",
          description: "Este mês já tinha sido encerrado.",
        });
        return;
      }

      const closedMonth: Month = {
        ...currentMonth,
        isClosed: true,
        closedAt: new Date(),
      };
      await db.put('months', closedMonth);

      const { year: nextYear, month: nextMonthNumber } = getNextMonth(currentMonth.year, currentMonth.month);

      let nextMonth = await db.getFromIndex('months', 'by-year-month', [nextYear, nextMonthNumber]);

      if (!nextMonth) {
        nextMonth = await createMonthWithDefaults({
          year: nextYear,
          month: nextMonthNumber,
          settings,
          accounts,
          previousBalances: balances,
          overrides: {
            incomeBase: settings.monthlyIncomeBase ?? 0,
            mealCard: currentMonth.incomeMealCard ?? settings.monthlyMealCardBalance ?? 0,
            creditCard: currentMonth.incomeCreditCard ?? settings.monthlyCreditCardBalance ?? 0,
            extraordinaryIncome: settings.monthlyExtraordinaryIncome ?? 0,
          },
        });
      }

      const hydratedNextMonth = normalizeMonthData(nextMonth);
      if (!hydratedNextMonth) {
        throw new Error('Falha ao criar o próximo mês');
      }

      const nextBalances = await db.getAllFromIndex('balances', 'by-month', [hydratedNextMonth.year, hydratedNextMonth.month]);
      const nextMovements = await db.getAllFromIndex('movements', 'by-month', [hydratedNextMonth.year, hydratedNextMonth.month]);

      setCurrentMonth(hydratedNextMonth);
      setBalances(nextBalances);
      setMovements(nextMovements);

      toast({
        title: "Mês fechado",
        description: "Criámos o próximo mês com os objetivos e automatismos planeados.",
      });
    } catch (error) {
      console.error('Failed to close month', error);
      toast({
        title: "Erro ao fechar mês",
        description: "Não foi possível fechar o mês. Tenta novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dashboard
        monthName={monthName}
        summary={summary}
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
        onCloseMonth={handleCloseMonth}
        distribution={distribution}
        bucketSummary={bucketSummary}
        suggestions={suggestions}
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
