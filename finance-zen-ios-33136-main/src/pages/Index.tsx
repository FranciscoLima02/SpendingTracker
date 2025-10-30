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
  EMPTY_MONTH_DISTRIBUTION,
  EMPTY_BUCKET_SUMMARY,
  isSubsidyMonth,
} from "@/lib/calculations";
import { getNextMonth, normalizeMonth, normalizeMonthOrNull } from "@/lib/month-helpers";
import { generateId } from "@/lib/id";
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
  const [isRecordingPayday, setIsRecordingPayday] = useState(false);
  const [isCreatingNext, setIsCreatingNext] = useState(false);
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

      const hydratedMonth = normalizeMonthOrNull(monthData);
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

  const distribution = useMemo(
    () => (currentMonth ? calculateMonthDistribution(currentMonth) : EMPTY_MONTH_DISTRIBUTION),
    [currentMonth],
  );
  const bucketSummary = useMemo(
    () =>
      currentMonth
        ? buildMonthBuckets(currentMonth, movements, accounts, balances)
        : EMPTY_BUCKET_SUMMARY,
    [currentMonth, movements, accounts, balances],
  );
  const suggestions = useMemo(
    () => (currentMonth ? generateSavingsSuggestions(currentMonth, bucketSummary) : []),
    [currentMonth, bucketSummary],
  );

  const normalizeCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

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

  async function handleSaveMovement(movement: Partial<Movement>) {
    if (!currentMonth) {
      toast({
        title: "Sem mês selecionado",
        description: "Seleciona um mês ativo antes de registares movimentos.",
        variant: "destructive",
      });
      return;
    }

    if (!movement.type || movement.amount == null) {
      toast({
        title: "Dados em falta",
        description: "Garante que definiste o tipo e o valor do movimento.",
        variant: "destructive",
      });
      return;
    }

    try {
      const db = await getDB();
      const referenceDate = movement.date ? new Date(movement.date) : new Date();
      const monthYear = movement.monthYear ?? referenceDate.getFullYear();
      const monthMonth = movement.monthMonth ?? referenceDate.getMonth() + 1;

      const normalizedMovement: Movement = {
        ...movement,
        id: generateId(),
        date: referenceDate,
        monthYear,
        monthMonth,
        createdAt: movement.createdAt ?? new Date(),
        updatedAt: new Date(),
        isSubsidyTagged: movement.isSubsidyTagged ?? false,
      } as Movement;

      await db.put('movements', normalizedMovement);

      if (monthYear === currentMonth.year && monthMonth === currentMonth.month) {
        const [refreshedMovements, refreshedBalances] = await Promise.all([
          db.getAllFromIndex('movements', 'by-month', [monthYear, monthMonth]),
          db.getAllFromIndex('balances', 'by-month', [monthYear, monthMonth]),
        ]);

        setMovements(refreshedMovements);
        setBalances(refreshedBalances);
      }

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

  async function handleRecordPaydayQuick() {
    if (!currentMonth || !settings) {
      toast({
        title: "Configuração em falta",
        description: "Garante que tens o mês atual e os valores padrão definidos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecordingPayday(true);
      const db = await getDB();

      const incomeBase = normalizeCurrency(settings.monthlyIncomeBase ?? currentMonth.incomeBase ?? 0);
      const mealCard = normalizeCurrency(settings.monthlyMealCardBalance ?? currentMonth.incomeMealCard ?? 0);
      const incomeExtra = normalizeCurrency(
        settings.monthlyExtraordinaryIncome ?? currentMonth.incomeExtraordinary ?? 0,
      );
      const creditCard = normalizeCurrency(
        settings.monthlyCreditCardBalance ?? currentMonth.incomeCreditCard ?? 0,
      );

      const monthDraft: Month = {
        ...currentMonth,
        incomeBase,
        incomeMealCard: mealCard,
        incomeExtraordinary: incomeExtra,
        incomeCreditCard: creditCard,
      };

      if (isSubsidyMonth(monthDraft) && incomeExtra > 0) {
        monthDraft.subsidyApplied = true;
        monthDraft.subsidyAmount = incomeExtra;
        monthDraft.incomeExtraordinary = 0;
      } else {
        monthDraft.subsidyApplied = false;
        monthDraft.subsidyAmount = 0;
      }

      const recalculated = applyDistributionToMonth(monthDraft);
      const normalizedMonth = normalizeMonth(recalculated);
      await db.put('months', normalizedMonth);

      const accountMap = accounts.reduce<Record<string, string>>((acc, account) => {
        acc[account.type] = account.id;
        return acc;
      }, {});

      const monthKey: [number, number] = [normalizedMonth.year, normalizedMonth.month];
      let monthMovements = await db.getAllFromIndex('movements', 'by-month', monthKey);

      const upsertIncome = async (
        category:
          | 'incomeSalary'
          | 'incomeMealCard'
          | 'incomeExtraordinary'
          | 'incomeSubsidy'
          | 'incomeCreditCard',
        amount: number,
        accountToId?: string,
      ) => {
        const existingIndex = monthMovements.findIndex(
          (movement) => movement.type === 'income' && movement.category === category,
        );
        const existing = existingIndex >= 0 ? monthMovements[existingIndex] : undefined;

        if (!accountToId) {
          if (existing) {
            await db.delete('movements', existing.id);
            monthMovements.splice(existingIndex, 1);
          }
          return;
        }

        if (amount > 0) {
          const defaultDate = existing?.date ?? new Date(normalizedMonth.year, normalizedMonth.month - 1, 1);
          if (existing) {
            const updated = {
              ...existing,
              amount,
              accountToId,
              date: defaultDate,
              updatedAt: new Date(),
            };
            await db.put('movements', updated);
            monthMovements[existingIndex] = updated;
          } else {
            const newMovement: Movement = {
              id: generateId(),
              date: defaultDate,
              type: 'income',
              amount,
              category,
              accountToId,
              isSubsidyTagged: category === 'incomeSubsidy',
              monthYear: normalizedMonth.year,
              monthMonth: normalizedMonth.month,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await db.put('movements', newMovement);
            monthMovements.push(newMovement);
          }
        } else if (existing) {
          await db.delete('movements', existing.id);
          monthMovements.splice(existingIndex, 1);
        }
      };

      await upsertIncome('incomeSalary', normalizedMonth.incomeBase ?? 0, accountMap['current']);
      await upsertIncome('incomeMealCard', normalizedMonth.incomeMealCard ?? 0, accountMap['mealCard']);

      if (normalizedMonth.subsidyApplied) {
        await upsertIncome('incomeSubsidy', normalizedMonth.subsidyAmount ?? 0, accountMap['current']);
        await upsertIncome('incomeExtraordinary', 0, accountMap['current']);
      } else {
        await upsertIncome('incomeExtraordinary', normalizedMonth.incomeExtraordinary ?? 0, accountMap['current']);
        await upsertIncome('incomeSubsidy', 0, accountMap['current']);
      }

      await upsertIncome('incomeCreditCard', normalizedMonth.incomeCreditCard ?? 0, accountMap['creditCard']);

      const [refreshedMovements, refreshedBalances] = await Promise.all([
        db.getAllFromIndex('movements', 'by-month', monthKey),
        db.getAllFromIndex('balances', 'by-month', monthKey),
      ]);

      setCurrentMonth(normalizedMonth);
      setMovements(refreshedMovements);
      setBalances(refreshedBalances);

      toast({
        title: "Entradas lançadas",
        description: "Atualizámos o plano com o payday deste mês.",
      });
    } catch (error) {
      console.error('Falha ao registar payday', error);
      toast({
        title: "Erro ao lançar entradas",
        description: "Não foi possível registar o payday automaticamente.",
        variant: "destructive",
      });
    } finally {
      setIsRecordingPayday(false);
    }
  }

  async function handleCreateNextMonthQuick() {
    if (!settings) {
      toast({
        title: "Configuração em falta",
        description: "Define primeiro as tuas preferências antes de criares um novo mês.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingNext(true);
      const db = await getDB();

      const reference = currentMonth ?? normalizeMonth(
        await createMonthWithDefaults({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          settings,
          accounts,
        }),
      );

      const { year: targetYear, month: targetMonth } = getNextMonth(reference.year, reference.month);
      const existing = await db.getFromIndex('months', 'by-year-month', [targetYear, targetMonth]);
      if (existing) {
        const normalizedExisting = normalizeMonth(existing);
        setCurrentMonth(normalizedExisting);
        const [nextBalances, nextMovements] = await Promise.all([
          db.getAllFromIndex('balances', 'by-month', [normalizedExisting.year, normalizedExisting.month]),
          db.getAllFromIndex('movements', 'by-month', [normalizedExisting.year, normalizedExisting.month]),
        ]);
        setBalances(nextBalances);
        setMovements(nextMovements);
        toast({
          title: "Mês já disponível",
          description: "Abrimos o mês seguinte que já estava criado.",
        });
        return;
      }

      const previousBalances = await db.getAllFromIndex('balances', 'by-month', [reference.year, reference.month]);
      const created = await createMonthWithDefaults({
        year: targetYear,
        month: targetMonth,
        settings,
        accounts,
        previousBalances,
      });

      const normalizedCreated = normalizeMonth(created);
      const [nextBalances, nextMovements] = await Promise.all([
        db.getAllFromIndex('balances', 'by-month', [targetYear, targetMonth]),
        db.getAllFromIndex('movements', 'by-month', [targetYear, targetMonth]),
      ]);

      setCurrentMonth(normalizedCreated);
      setBalances(nextBalances);
      setMovements(nextMovements);

      toast({
        title: "Novo mês criado",
        description: "Duplicámos o plano anterior para começares já o próximo ciclo.",
      });
    } catch (error) {
      console.error('Falha ao criar próximo mês', error);
      toast({
        title: "Erro ao criar mês",
        description: "Não conseguimos gerar o próximo mês.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingNext(false);
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
              id: generateId(),
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
      const normalizedClosed = normalizeMonth(closedMonth);
      await db.put('months', normalizedClosed);
      setCurrentMonth(normalizedClosed);

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

      const hydratedNextMonth = normalizeMonthOrNull(nextMonth ?? null);
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
        onRecordPayday={handleRecordPaydayQuick}
        onCreateNextMonth={handleCreateNextMonthQuick}
        paydayLoading={isRecordingPayday}
        creatingNextMonth={isCreatingNext}
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
