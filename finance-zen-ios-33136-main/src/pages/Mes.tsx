import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  PlusCircle,
  Lock,
  Unlock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Wallet,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  getDB,
  Month,
  Movement,
  Account,
  AppSettings,
  createMonthWithDefaults,
  initializeDefaultData,
  AccountBalance,
} from "@/lib/db";
import {
  applyDistributionToMonth,
  calculatePlannedIncome,
  calculateActualIncome,
  calculatePlannedExpenses,
  calculateActualExpenses,
  calculatePlannedTransfers,
  calculateActualTransfers,
  calculatePlannedIncomeTotal,
  calculatePlannedOutflows,
  calculatePlannedAvailable,
  calculateCashFlow,
  formatCurrency,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  TRANSFER_CATEGORY_LABELS,
  sumRecord,
  calculateMonthDistribution,
  isSubsidyMonth,
  EMPTY_MONTH_DISTRIBUTION,
  buildMonthBuckets,
  EMPTY_BUCKET_SUMMARY,
  generateSavingsSuggestions,
} from "@/lib/calculations";
import { normalizeMonth, getNextMonth } from "@/lib/month-helpers";
import { generateId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { MovementDialog, type MovementDialogDefaults } from "@/components/MovementDialog";
import { CardFundingDialog } from "@/components/CardFundingDialog";

const categoryIcons: Record<string, any> = {
  income: TrendingUp,
  expense: TrendingDown,
  transfer: ArrowDownUp,
};

const categoryLabels: Record<string, string> = {
  ...INCOME_CATEGORY_LABELS,
  ...EXPENSE_CATEGORY_LABELS,
  ...TRANSFER_CATEGORY_LABELS,
};

export default function Mes() {
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [month, setMonth] = useState<Month | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formValues, setFormValues] = useState({
    incomeBase: "0.00",
    mealCard: "0.00",
    incomeExtra: "0.00",
    fixedExpenses: "0.00",
    foodExpenses: "0.00",
  });
  const [isSavingInputs, setIsSavingInputs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydratingMonth, setIsHydratingMonth] = useState(false);
  const [isCreatingMonth, setIsCreatingMonth] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [isRecordingPayday, setIsRecordingPayday] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementDialogType, setMovementDialogType] = useState<'expense' | 'transfer' | 'income'>('expense');
  const [movementDialogDefaults, setMovementDialogDefaults] = useState<MovementDialogDefaults | undefined>(undefined);
  const [cardFundingDialogOpen, setCardFundingDialogOpen] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickAccount, setQuickAccount] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [isWizardSubmitting, setIsWizardSubmitting] = useState(false);
  const [wizardValues, setWizardValues] = useState({
    incomeBase: 0,
    mealCard: 0,
    incomeExtra: 0,
    fixedExpenses: 0,
    foodExpenses: 0,
    overrides: {
      savings: 0,
      cryptoCore: 0,
      cryptoShit: 0,
      leisure: 0,
      shitMoney: 0,
      buffer: 0,
    },
  });
  const [movementActionId, setMovementActionId] = useState<string | null>(null);
  const [isDeletingMovement, setIsDeletingMovement] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    bootstrap();
  }, []);

  const sortMonthsDesc = (list: Month[]) =>
    [...list].sort((a, b) => {
      if (a.year === b.year) {
        return b.month - a.month;
      }
      return b.year - a.year;
    });

  const upsertMonthInState = (updated: Month) => {
    setMonths((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      const next = exists ? prev.map((item) => (item.id === updated.id ? updated : item)) : [...prev, updated];
      return sortMonthsDesc(next);
    });
  };

  async function bootstrap(targetId?: string) {
    setIsLoading(true);
    try {
      await initializeDefaultData();
      const db = await getDB();
      const [rawMonths, allAccounts, loadedSettings] = await Promise.all([
        db.getAll('months'),
        db.getAll('accounts'),
        db.get('settings', 'default'),
      ]);

      const normalizedSettings = loadedSettings ?? null;
      setSettings(normalizedSettings);
      setAccounts(allAccounts);
      setBalances([]);

      const allMonths = rawMonths.map((record) => normalizeMonth(record));
      const sortedMonths = sortMonthsDesc(allMonths);
      setMonths(sortedMonths);

      const preferredMonth = targetId
        ? sortedMonths.find((item) => item.id === targetId) ?? sortedMonths[0]
        : sortedMonths[0];

      if (preferredMonth) {
        await hydrateMonth(preferredMonth.id, preferredMonth);
      } else {
        setSelectedMonthId(null);
        setMonth(null);
        setMovements([]);
        setBalances([]);
      }
    } catch (error) {
      console.error('Falha ao carregar os meses', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não conseguimos carregar os meses. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function hydrateMonth(id: string, cached?: Month) {
    setIsHydratingMonth(true);
    try {
      const db = await getDB();
      const storedMonth = cached ?? (await db.get('months', id));
      if (!storedMonth) {
        return;
      }

      const normalized = normalizeMonth(storedMonth);
      const [monthMovements, monthBalances] = await Promise.all([
        db.getAllFromIndex('movements', 'by-month', [normalized.year, normalized.month]),
        db.getAllFromIndex('balances', 'by-month', [normalized.year, normalized.month]),
      ]);

      setSelectedMonthId(normalized.id);
      setMonth(normalized);
      setMovements(monthMovements);
      setBalances(monthBalances);
    } finally {
      setIsHydratingMonth(false);
    }
  }

  useEffect(() => {
    if (!month) return;

    const formatNumber = (value: number | undefined | null) =>
      Number.isFinite(value ?? NaN) ? (value ?? 0).toFixed(2) : "0.00";

    const extraValue = month.subsidyApplied
      ? month.subsidyAmount ?? 0
      : month.incomeExtraordinary ?? 0;

    setFormValues({
      incomeBase: formatNumber(month.incomeBase),
      mealCard: formatNumber(month.incomeMealCard),
      incomeExtra: formatNumber(extraValue),
      fixedExpenses: formatNumber(month.actualFixedExpenses ?? month.fixedExpenses),
      foodExpenses: formatNumber(month.actualFoodExpenses ?? month.plannedFood ?? month.foodPlanned),
    });

    setWizardValues({
      incomeBase: month.incomeBase ?? 0,
      mealCard: month.incomeMealCard ?? 0,
      incomeExtra: month.subsidyApplied ? month.subsidyAmount ?? 0 : month.incomeExtraordinary ?? 0,
      fixedExpenses: month.actualFixedExpenses ?? month.fixedExpenses ?? 0,
      foodExpenses: month.actualFoodExpenses ?? month.plannedFood ?? month.foodPlanned ?? 0,
      overrides: {
        savings: month.plannedSavings ?? 0,
        cryptoCore: month.plannedCryptoCore ?? 0,
        cryptoShit: month.plannedCryptoShit ?? 0,
        leisure: month.plannedLeisure ?? 0,
        shitMoney: month.plannedShitMoney ?? 0,
        buffer: month.plannedBuffer ?? 0,
      },
    });
  }, [month]);

  useEffect(() => {
    if (!quickAccount && accounts.length > 0) {
      setQuickAccount(accounts[0].id);
    }
  }, [accounts, quickAccount]);

  const handleInputChange = (field: keyof typeof formValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const parseInputValue = (value: string) => {
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  type MonthInputPayload = {
    incomeBase: number;
    mealCard: number;
    incomeExtra: number;
    fixedExpenses: number;
    foodExpenses: number;
  };

  type PlanOverrides = {
    savings?: number;
    cryptoCore?: number;
    cryptoShit?: number;
    leisure?: number;
    shitMoney?: number;
    buffer?: number;
  };

  const roundTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  function calculateMonthFromInputs(values: MonthInputPayload, overrides?: PlanOverrides) {
    if (!month) return null;

    const monthDraft: Month = {
      ...month,
      incomeBase: roundTwo(values.incomeBase),
      incomeMealCard: roundTwo(values.mealCard),
      incomeExtraordinary: roundTwo(values.incomeExtra),
      actualFixedExpenses: roundTwo(values.fixedExpenses),
      actualFoodExpenses: roundTwo(values.foodExpenses),
      lastInputsUpdatedAt: new Date(),
    };

    if (isSubsidyMonth(monthDraft) && values.incomeExtra > 0) {
      monthDraft.subsidyApplied = true;
      monthDraft.subsidyAmount = roundTwo(values.incomeExtra);
      monthDraft.incomeExtraordinary = 0;
    } else {
      monthDraft.subsidyApplied = false;
      monthDraft.subsidyAmount = 0;
    }

    let recalculated = applyDistributionToMonth(monthDraft);

    if (overrides) {
      const baseValues = {
        savings: overrides.savings ?? recalculated.plannedSavings ?? 0,
        cryptoCore: overrides.cryptoCore ?? recalculated.plannedCryptoCore ?? 0,
        shitMoney: overrides.shitMoney ?? recalculated.plannedShitMoney ?? 0,
        leisure: overrides.leisure ?? recalculated.plannedLeisure ?? 0,
        buffer: overrides.buffer ?? recalculated.plannedBuffer ?? 0,
      };

      recalculated = {
        ...recalculated,
        plannedSavings: roundTwo(baseValues.savings),
        plannedCryptoCore: roundTwo(baseValues.cryptoCore),
        plannedShitMoney: roundTwo(baseValues.shitMoney),
        plannedLeisure: roundTwo(baseValues.leisure),
        plannedBuffer: roundTwo(baseValues.buffer),
        plannedCryptoShit: overrides.cryptoShit != null ? roundTwo(overrides.cryptoShit) : recalculated.plannedCryptoShit,
      };

      const baseTotal = Object.values(baseValues).reduce((total, value) => total + value, 0);
      if (baseTotal > 0) {
        recalculated = {
          ...recalculated,
          distributionSavings: baseValues.savings / baseTotal,
          distributionCore: baseValues.cryptoCore / baseTotal,
          distributionShit: baseValues.shitMoney / baseTotal,
          distributionFun: baseValues.leisure / baseTotal,
          distributionBuffer: baseValues.buffer / baseTotal,
        };
      }
    }

    return normalizeMonth(recalculated);
  }

  async function persistMonthInputs(
    values: MonthInputPayload,
    options?: { planOverrides?: PlanOverrides; successMessage?: { title: string; description?: string } },
  ) {
    if (!month) return;
    if (month.isClosed) {
      toast({
        title: 'Mês fechado',
        description: 'Reabre o mês para atualizares os valores.',
        variant: 'destructive',
      });
      return;
    }

    const db = await getDB();
    const normalizedMonth = calculateMonthFromInputs(values, options?.planOverrides);
    if (!normalizedMonth) return;
    await db.put('months', normalizedMonth);

    const accountMap = accounts.reduce<
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

    const monthKey: [number, number] = [normalizedMonth.year, normalizedMonth.month];
    let monthMovements = await db.getAllFromIndex('movements', 'by-month', monthKey);

    const upsertIncome = async (
      category:
        | 'incomeSalary'
        | 'incomeMealCard'
        | 'incomeExtraordinary'
        | 'incomeSubsidy',
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
            amount: roundTwo(amount),
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
            amount: roundTwo(amount),
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

    const [refreshedMovements, refreshedBalances] = await Promise.all([
      db.getAllFromIndex('movements', 'by-month', monthKey),
      db.getAllFromIndex('balances', 'by-month', monthKey),
    ]);

    setMonth(normalizedMonth);
    upsertMonthInState(normalizedMonth);
    setMovements(refreshedMovements);
    setBalances(refreshedBalances);

    toast(
      options?.successMessage ?? {
        title: 'Entradas do mês atualizadas',
        description: 'Recalculámos as metas e saldos automaticamente.',
      },
  );
}

  async function handleSaveInputs() {
    try {
      setIsSavingInputs(true);
      await persistMonthInputs({
        incomeBase: parseInputValue(formValues.incomeBase),
        mealCard: parseInputValue(formValues.mealCard),
        incomeExtra: parseInputValue(formValues.incomeExtra),
        fixedExpenses: parseInputValue(formValues.fixedExpenses),
        foodExpenses: parseInputValue(formValues.foodExpenses),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao guardar inputs',
        description: 'Tenta novamente. Verifica os valores introduzidos.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingInputs(false);
    }
  }

  async function handleRecordPayday() {
    if (!settings || !month) {
      toast({
        title: 'Configuração em falta',
        description: 'Define primeiro os valores mensais nas definições.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsRecordingPayday(true);
      await persistMonthInputs(
        {
          incomeBase: settings.monthlyIncomeBase ?? month.incomeBase ?? 0,
          mealCard: settings.monthlyMealCardBalance ?? month.incomeMealCard ?? 0,
          incomeExtra: settings.monthlyExtraordinaryIncome ?? month.incomeExtraordinary ?? 0,
          fixedExpenses: month.actualFixedExpenses ?? month.fixedExpenses ?? settings.fixedExpenses ?? 0,
          foodExpenses: month.actualFoodExpenses ?? month.plannedFood ?? settings.foodPlannedMonthly ?? 0,
        },
        {
          successMessage: {
            title: 'Payday registado',
            description: 'Criámos as entradas planeadas e atualizámos as metas das bolsas.',
          },
        },
      );
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao registar payday',
        description: 'Não foi possível lançar as entradas automáticas. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRecordingPayday(false);
    }
  }

  async function handleQuickExpenseSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!month) return;
    if (month.isClosed) {
      toast({
        title: 'Mês fechado',
        description: 'Reabre o mês para adicionares novos movimentos.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(quickAmount.replace(',', '.'));
    if (!quickCategory || !quickAccount || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Dados em falta',
        description: 'Preenche o valor, a categoria e a conta antes de gravar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsQuickSaving(true);
      const db = await getDB();
      const newMovement: Movement = {
        id: generateId(),
        date: new Date(),
        type: 'expense',
        amount: roundTwo(amount),
        category: quickCategory,
        accountFromId: quickAccount,
        isSubsidyTagged: false,
        monthYear: month.year,
        monthMonth: month.month,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.put('movements', newMovement);
      const refreshedBalances = await db.getAllFromIndex('balances', 'by-month', [month.year, month.month]);

      setMovements((prev) => [...prev, newMovement]);
      setBalances(refreshedBalances);
      setQuickAmount('');
      toast({
        title: 'Despesa registada',
        description: 'Adicionámos o movimento à lista deste mês.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao adicionar movimento',
        description: 'Não foi possível registar a despesa rápida.',
        variant: 'destructive',
      });
    } finally {
      setIsQuickSaving(false);
    }
  }

  const handleMonthStep = async (direction: 'prev' | 'next') => {
    if (!month) return;
    const currentIndex = months.findIndex((item) => item.id === month.id);
    if (currentIndex === -1) return;

    const delta = direction === 'prev' ? 1 : -1;
    const target = months[currentIndex + delta];
    if (target) {
      await handleMonthChange(target.id);
    }
  };

  const openMovementDialogWithDefaults = (
    type: 'expense' | 'income' | 'transfer',
    defaults?: MovementDialogDefaults,
  ) => {
    setMovementDialogType(type);
    setMovementDialogDefaults(defaults);
    setMovementDialogOpen(true);
  };

  const openWizard = () => {
    if (isLocked) {
      toast({
        title: 'Mês fechado',
        description: 'Reabre o mês para ajustares o plano.',
        variant: 'destructive',
      });
      return;
    }
    setWizardStep(0);
    setIsWizardOpen(true);
  };

  async function handleMovementDialogSave(movement: Partial<Movement>) {
    if (!month) return;

    if (!movement.type || movement.amount == null) {
      toast({
        title: 'Dados em falta',
        description: 'Garante que definiste o tipo e o valor do movimento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const db = await getDB();
      const referenceDate = movement.date ? new Date(movement.date) : new Date(month.year, month.month - 1, 1);
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

      if (monthYear === month.year && monthMonth === month.month) {
        const [refreshedMovements, refreshedBalances] = await Promise.all([
          db.getAllFromIndex('movements', 'by-month', [monthYear, monthMonth]),
          db.getAllFromIndex('balances', 'by-month', [monthYear, monthMonth]),
        ]);

        setMovements(refreshedMovements);
        setBalances(refreshedBalances);
      }

      toast({
        title: 'Movimento registado',
        description: 'Atualizámos o saldo das bolsas.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao guardar movimento',
        description: 'Tenta novamente dentro de instantes.',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteMovement(movementId: string) {
    if (!month) return;
    if (month.isClosed) {
      toast({
        title: 'Mês fechado',
        description: 'Reabre o mês para poderes remover movimentos.',
        variant: 'destructive',
      });
      return;
    }

    const target = movements.find((movement) => movement.id === movementId);
    if (!target) return;

    const confirmDelete = window.confirm('Queres mesmo apagar este movimento? Esta ação é irreversível.');
    if (!confirmDelete) return;

    setMovementActionId(movementId);
    setIsDeletingMovement(true);

    try {
      const db = await getDB();
      await db.delete('movements', movementId);
      const monthKey: [number, number] = [month.year, month.month];
      const [refreshedMovements, refreshedBalances] = await Promise.all([
        db.getAllFromIndex('movements', 'by-month', monthKey),
        db.getAllFromIndex('balances', 'by-month', monthKey),
      ]);

      setMovements(refreshedMovements);
      setBalances(refreshedBalances);

      toast({
        title: 'Movimento apagado',
        description: 'Removemos o registo e atualizámos os totais do mês.',
      });
    } catch (error) {
      console.error('Falha ao apagar movimento', error);
      toast({
        title: 'Erro ao apagar movimento',
        description: 'Não foi possível remover este registo. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setMovementActionId(null);
      setIsDeletingMovement(false);
    }
  }

  const handleWizardNext = () => setWizardStep((step) => Math.min(step + 1, 3));
  const handleWizardPrevious = () => setWizardStep((step) => Math.max(step - 1, 0));

  async function handleWizardApply() {
    try {
      setIsWizardSubmitting(true);
      await persistMonthInputs(
        {
          incomeBase: wizardValues.incomeBase,
          mealCard: wizardValues.mealCard,
          incomeExtra: wizardValues.incomeExtra,
          fixedExpenses: wizardValues.fixedExpenses,
          foodExpenses: wizardValues.foodExpenses,
        },
        {
          planOverrides: wizardValues.overrides,
          successMessage: {
            title: 'Plano do mês preparado',
            description: 'Aplicámos as tuas entradas e metas personalizadas.',
          },
        },
      );
      setIsWizardOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao preparar mês',
        description: 'Revê os valores e tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsWizardSubmitting(false);
    }
  }

  async function handleMonthChange(value: string) {
    const previousId = selectedMonthId ?? month?.id ?? null;
    setSelectedMonthId(value);
    setMonth(null);
    setMovements([]);

    try {
      await hydrateMonth(value);
    } catch (error) {
      console.error('Falha ao carregar mês selecionado', error);
      toast({
        title: 'Erro ao abrir mês',
        description: 'Não conseguimos abrir o mês escolhido. Tenta novamente.',
        variant: 'destructive',
      });
      if (previousId) {
        await hydrateMonth(previousId);
      }
    }
  }

  async function handleCreateNextMonth() {
    if (!settings) {
      toast({
        title: 'Configuração em falta',
        description: 'Define primeiro as preferências nas definições.',
        variant: 'destructive',
      });
      return;
    }

    if (!accounts.length) {
      toast({
        title: 'Sem contas configuradas',
        description: 'Cria pelo menos uma conta para poderes gerar um novo mês.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingMonth(true);
    try {
      const ordered = sortMonthsDesc(months);
      const latest = ordered[0] ?? null;
      let targetYear: number;
      let targetMonth: number;

      if (latest) {
        const next = getNextMonth(latest.year, latest.month);
        targetYear = next.year;
        targetMonth = next.month;
        const exists = ordered.some((m) => m.year === targetYear && m.month === targetMonth);
        if (exists) {
          toast({
            title: 'Mês já existente',
            description: 'O próximo mês já foi criado automaticamente.',
          });
          return;
        }
      } else {
        const now = new Date();
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
      }

      const db = await getDB();
      const previousBalances = latest
        ? await db.getAllFromIndex('balances', 'by-month', [latest.year, latest.month])
        : undefined;

      const created = await createMonthWithDefaults({
        year: targetYear,
        month: targetMonth,
        settings,
        accounts,
        previousBalances,
      });

      const normalizedCreated = normalizeMonth(created);
      upsertMonthInState(normalizedCreated);
      setMonth(null);
      setMovements([]);
      await hydrateMonth(normalizedCreated.id, normalizedCreated);

      toast({
        title: 'Novo mês criado',
        description: 'Já podes começar a registar o planeamento do próximo mês.',
      });
    } catch (error) {
      console.error('Falha ao criar novo mês', error);
      toast({
        title: 'Erro ao criar mês',
        description: 'Não conseguimos criar o próximo mês. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingMonth(false);
    }
  }

  async function handleReopenMonth() {
    if (!month) return;
    if (!month.isClosed) {
      toast({
        title: 'Mês já aberto',
        description: 'Este mês já pode ser editado.',
      });
      return;
    }

    setIsTogglingStatus(true);
    try {
      const db = await getDB();
      const reopened = normalizeMonth({ ...month, isClosed: false, closedAt: undefined });
      await db.put('months', reopened);
      setMonth(reopened);
      setSelectedMonthId(reopened.id);
      upsertMonthInState(reopened);

      toast({
        title: 'Mês reaberto',
        description: 'Já podes ajustar os valores deste mês.',
      });
    } catch (error) {
      console.error('Falha ao reabrir mês', error);
      toast({
        title: 'Erro ao reabrir mês',
        description: 'Não foi possível reabrir o mês. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleCloseCurrentMonth() {
    if (!month || !settings) {
      toast({
        title: 'Informação em falta',
        description: 'Garante que existe um mês selecionado e configurações guardadas.',
        variant: 'destructive',
      });
      return;
    }

    if (month.isClosed) {
      toast({
        title: 'Mês já fechado',
        description: 'Este mês já estava concluído.',
      });
      return;
    }

    setIsTogglingStatus(true);
    try {
      const db = await getDB();
      const closedMonth = normalizeMonth({ ...month, isClosed: true, closedAt: new Date() });
      await db.put('months', closedMonth);
      upsertMonthInState(closedMonth);

      const { year: nextYear, month: nextMonthNumber } = getNextMonth(month.year, month.month);

      let nextMonthRecord = months.find(
        (item) => item.year === nextYear && item.month === nextMonthNumber,
      );

      if (!nextMonthRecord) {
        const previousBalances = await db.getAllFromIndex('balances', 'by-month', [month.year, month.month]);
        nextMonthRecord = await createMonthWithDefaults({
          year: nextYear,
          month: nextMonthNumber,
          settings,
          accounts,
          previousBalances,
        });
      }

      const normalizedNext = nextMonthRecord ? normalizeMonth(nextMonthRecord) : null;
      if (normalizedNext) {
        upsertMonthInState(normalizedNext);
        setMonth(null);
        setMovements([]);
        await hydrateMonth(normalizedNext.id, normalizedNext);
      } else {
        setMonth(closedMonth);
        setSelectedMonthId(closedMonth.id);
        const refreshedMovements = await db.getAllFromIndex('movements', 'by-month', [
          closedMonth.year,
          closedMonth.month,
        ]);
        setMovements(refreshedMovements);
      }

      toast({
        title: 'Mês fechado',
        description: 'Guardámos o resumo e preparámos o mês seguinte.',
      });
    } catch (error) {
      console.error('Falha ao fechar mês', error);
      toast({
        title: 'Erro ao fechar mês',
        description: 'Não foi possível concluir o mês atual. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleDeleteMonth() {
    if (!month) return;

    const monthLabel = format(new Date(month.year, month.month - 1), "MMMM yyyy", { locale: pt });
    const firstConfirm = window.confirm(
      `Tens a certeza que queres apagar o mês de ${monthLabel}? Todos os movimentos e saldos associados serão removidos.`,
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm('Esta ação é irreversível. Confirma que queres mesmo apagar este mês.');
    if (!secondConfirm) return;

    setIsDeletingMonth(true);
    try {
      const db = await getDB();
      const monthKey: [number, number] = [month.year, month.month];
      const [monthBalances, monthMovements] = await Promise.all([
        db.getAllFromIndex('balances', 'by-month', monthKey),
        db.getAllFromIndex('movements', 'by-month', monthKey),
      ]);

      const tx = db.transaction(['months', 'balances', 'movements'], 'readwrite');
      await tx.objectStore('months').delete(month.id);
      const balancesStore = tx.objectStore('balances');
      for (const balance of monthBalances) {
        await balancesStore.delete(balance.id);
      }
      const movementsStore = tx.objectStore('movements');
      for (const movement of monthMovements) {
        await movementsStore.delete(movement.id);
      }
      await tx.done;

      const remaining = sortMonthsDesc(months.filter((item) => item.id !== month.id));
      setMonths(remaining);

      if (remaining.length > 0) {
        const fallback = remaining[0];
        setSelectedMonthId(fallback.id);
        setMonth(null);
        setMovements([]);
        await hydrateMonth(fallback.id, fallback);
      } else {
        setSelectedMonthId(null);
        setMonth(null);
        setMovements([]);
        setBalances([]);
      }

      toast({
        title: 'Mês apagado',
        description: `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} foi removido com sucesso.`,
      });
    } catch (error) {
      console.error('Falha ao apagar mês', error);
      toast({
        title: 'Erro ao apagar mês',
        description: 'Não foi possível remover o mês selecionado. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingMonth(false);
    }
  }

  const monthDistribution = useMemo(
    () => (month ? calculateMonthDistribution(month) : EMPTY_MONTH_DISTRIBUTION),
    [month],
  );

  const bucketSummary = useMemo(
    () =>
      month
        ? buildMonthBuckets(month, movements, accounts, balances)
        : EMPTY_BUCKET_SUMMARY,
    [month, movements, accounts, balances],
  );

  const suggestions = useMemo(
    () => (month ? generateSavingsSuggestions(month, bucketSummary) : []),
    [month, bucketSummary],
  );

  const accountTypeMap = useMemo(() => {
    return accounts.reduce<Partial<Record<Account['type'], string>>>((acc, account) => {
      acc[account.type] = account.id;
      return acc;
    }, {});
  }, [accounts]);

  const quickExpenseOptions = useMemo(
    () =>
      Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const movementFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: 'Todas as categorias' },
        ...Object.entries(categoryLabels).map(([value, label]) => ({
          value,
          label,
        })),
      ],
    [],
  );

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => !['savings', 'cryptoCore', 'cryptoShit'].includes(account.type))
        .map((account) => ({
          value: account.id,
          label: account.name,
        })),
    [accounts],
  );

  const filteredMovements = useMemo(() => {
    const sorted = [...movements].sort((a, b) => b.date.getTime() - a.date.getTime());
    if (movementFilter === 'all') {
      return sorted;
    }
    return sorted.filter((movement) => movement.category === movementFilter);
  }, [movements, movementFilter]);

  const recentMovements = useMemo(() => filteredMovements.slice(0, 10), [filteredMovements]);

  const wizardPreview = useMemo(() => {
    if (!month) return null;
    return calculateMonthFromInputs(
      {
        incomeBase: wizardValues.incomeBase,
        mealCard: wizardValues.mealCard,
        incomeExtra: wizardValues.incomeExtra,
        fixedExpenses: wizardValues.fixedExpenses,
        foodExpenses: wizardValues.foodExpenses,
      },
      wizardValues.overrides,
    );
  }, [month, wizardValues]);

  const wizardPreviewDistribution = useMemo(
    () => (wizardPreview ? calculateMonthDistribution(wizardPreview) : null),
    [wizardPreview],
  );

  const isLocked = month?.isClosed ?? false;
  const selectedIndex = month ? months.findIndex((item) => item.id === month.id) : -1;
  const hasPrevious = selectedIndex >= 0 && selectedIndex < months.length - 1;
  const hasNext = selectedIndex > 0;

  const bucketCards = month
    ? [
        {
          id: 'account',
          title: 'Conta',
          plan: bucketSummary.account.plan,
          actual: bucketSummary.account.outflow,
          remaining: bucketSummary.account.remainingPlan,
          subtitle: 'Saldo disponível na conta corrente',
          action: {
            type: 'expense' as const,
            defaults: {
              accountFromId: accountTypeMap.current,
            } satisfies MovementDialogDefaults,
          },
        },
        {
          id: 'mealCard',
          title: 'Refeição',
          plan: bucketSummary.mealCard.plan,
          actual: bucketSummary.mealCard.foodSpent,
          remaining: bucketSummary.mealCard.remainingPlan,
          subtitle: 'Cartão refeição para comida do mês',
          action: {
            type: 'expense' as const,
            defaults: {
              category: 'food',
              accountFromId: accountTypeMap.mealCard,
            } as MovementDialogDefaults,
          },
        },
        {
          id: 'leisure',
          title: 'Lazer',
          plan: bucketSummary.leisure.plan,
          actual: bucketSummary.leisure.actual,
          remaining: bucketSummary.leisure.remaining,
          subtitle: 'Cafés, saídas e experiências',
          action: {
            type: 'expense' as const,
            defaults: {
              category: 'leisure',
              accountFromId: accountTypeMap.current,
            } as MovementDialogDefaults,
          },
        },
        {
          id: 'shitMoney',
          title: 'Shit Money',
          plan: bucketSummary.shitMoney.plan,
          actual: bucketSummary.shitMoney.actual,
          remaining: bucketSummary.shitMoney.remaining,
          subtitle: 'Investimento arriscado ou impulsivo',
          action: {
            type: 'expense' as const,
            defaults: {
              category: 'shitMoney',
              accountFromId: accountTypeMap.current,
            } as MovementDialogDefaults,
          },
        },
        {
          id: 'savings',
          title: 'Poupança',
          plan: bucketSummary.savings.plan,
          actual: bucketSummary.savings.actual,
          remaining: bucketSummary.savings.remaining,
          subtitle: 'Transferências para o cofre mensal',
          action: {
            type: 'transfer' as const,
            defaults: {
              category: 'transferenciaPoupanca',
              accountFromId: accountTypeMap.current,
              accountToId: accountTypeMap.savings,
            } as MovementDialogDefaults,
          },
        },
        {
          id: 'crypto',
          title: 'Crypto',
          plan: bucketSummary.crypto.plan,
          actual: bucketSummary.crypto.actual,
          remaining: bucketSummary.crypto.remaining,
          subtitle: 'Core + Shit investidos este mês',
          action: {
            type: 'transfer' as const,
            defaults: {
              category: 'compraCryptoCore',
              accountFromId: accountTypeMap.current,
              accountToId: accountTypeMap.cryptoCore ?? accountTypeMap.cryptoShit,
            } as MovementDialogDefaults,
          },
        },
      ]
    : [];

  if ((isLoading || isHydratingMonth) && !month) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!month) {
    return (
      <div className="min-h-screen bg-background p-6 pb-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Ainda não tens meses configurados</h1>
          <p className="text-muted-foreground">
            Cria o primeiro mês para começares a controlar entradas, despesas e objetivos de poupança.
          </p>
          <Button onClick={handleCreateNextMonth} disabled={isCreatingMonth} className="mx-auto">
            {isCreatingMonth ? 'A criar…' : 'Criar mês atual'}
          </Button>
        </div>
      </div>
    );
  }

  
  const monthName = format(new Date(month.year, month.month - 1), "MMMM yyyy", { locale: pt });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const plannedIncome = calculatePlannedIncome(month);
  const actualIncome = calculateActualIncome(movements);
  const summary = {
    plannedIncomeTotal: calculatePlannedIncomeTotal(month),
    plannedOutflows: calculatePlannedOutflows(month),
    plannedAvailable: calculatePlannedAvailable(month),
    actualIncomeTotal: sumRecord(actualIncome),
    actualExpensesTotal: sumRecord(calculateActualExpenses(movements)),
    actualTransfersTotal: sumRecord(calculateActualTransfers(movements)),
    cashFlow: calculateCashFlow(month, movements),
  };

  const actualOutflows = summary.actualExpensesTotal + summary.actualTransfersTotal;

  return (
    <>
      <div className="min-h-screen bg-background pb-28">
        <div className="max-w-4xl mx-auto space-y-6 px-4 pt-4">
          <Card className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleMonthStep('prev')}
                    disabled={!hasPrevious}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Mês atual</p>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-semibold text-foreground">{monthLabel}</h1>
                      <Badge variant={isLocked ? 'outline' : 'secondary'}>{isLocked ? 'Fechado' : 'Aberto'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {movements.length} movimentos · {formatCurrency(summary.plannedAvailable)} planeado
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleMonthStep('next')}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary">Recebido</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{formatCurrency(summary.actualIncomeTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      Planeado: {formatCurrency(summary.plannedIncomeTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-destructive">Gasto</p>
                    <p className="mt-1 text-lg font-semibold text-destructive">{formatCurrency(actualOutflows)}</p>
                    <p className="text-xs text-muted-foreground">
                      Limite: {formatCurrency(summary.plannedOutflows)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-accent">Disponível</p>
                    <p className="mt-1 text-lg font-semibold text-accent">
                      {formatCurrency(summary.plannedAvailable - actualOutflows)}
                    </p>
                    <p className="text-xs text-muted-foreground">Plano mensal em curso</p>
                  </div>
                  <div className="rounded-lg border border-success/20 bg-success/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-success">Cash flow</p>
                    <p className="mt-1 text-lg font-semibold text-success">{formatCurrency(summary.cashFlow)}</p>
                    <p className="text-xs text-muted-foreground">Entradas - saídas reais</p>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-60">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Novo movimento
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={() => openMovementDialogWithDefaults('expense', { accountFromId: accountTypeMap.current })}
                    >
                      Despesa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => openMovementDialogWithDefaults('income', { accountToId: accountTypeMap.current })}
                    >
                      Entrada
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => openMovementDialogWithDefaults('transfer', {
                        accountFromId: accountTypeMap.current,
                        accountToId: accountTypeMap.savings,
                      })}
                    >
                      Transferência
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLocked}
                  onClick={() => setCardFundingDialogOpen(true)}
                >
                  <Wallet className="mr-2 h-4 w-4" /> Atualizar recebimentos
                </Button>
                <Button
                  type="button"
                  variant={isLocked ? 'secondary' : 'destructive'}
                  disabled={isTogglingStatus}
                  onClick={isLocked ? handleReopenMonth : handleCloseCurrentMonth}
                >
                  {isTogglingStatus
                    ? 'A processar…'
                    : isLocked
                    ? 'Reabrir mês'
                    : 'Fechar mês'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      Mais ações <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={openWizard} disabled={isLocked}>
                      Iniciar mês guiado
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => void handleCreateNextMonth()}
                      disabled={isCreatingMonth}
                    >
                      {isCreatingMonth ? 'A duplicar…' : 'Novo mês a partir deste'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => void handleRecordPayday()}
                      disabled={isRecordingPayday || isLocked}
                    >
                      {isRecordingPayday ? 'A lançar…' : 'Recebi o mês'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleDeleteMonth()}
                      disabled={isDeletingMonth}
                      className="text-destructive"
                    >
                      {isDeletingMonth ? 'A apagar…' : 'Apagar mês'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleRecordPayday()}
                disabled={isRecordingPayday || isLocked}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isRecordingPayday ? 'A lançar entradas…' : 'Recebi o mês'}
              </Button>
              <Button type="button" variant="outline" onClick={openWizard} disabled={isLocked}>
                <CalendarDays className="mr-2 h-4 w-4" /> Preparar mês
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCreateNextMonth()}
                disabled={isCreatingMonth}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> {isCreatingMonth ? 'A duplicar…' : 'Novo mês'}
              </Button>
            </div>
          </Card>

          {isLocked && (
            <Card className="border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-primary">Mês fechado</p>
                  <p className="text-sm text-primary/80">
                    Reabre para atualizar valores ou regista novos movimentos.
                  </p>
                </div>
                <Button variant="outline" onClick={handleReopenMonth} disabled={isTogglingStatus}>
                  <Unlock className="mr-2 h-4 w-4" /> Reabrir mês
                </Button>
              </div>
            </Card>
          )}

          <Card className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Inputs rápidos do mês</h2>
                <p className="text-sm text-muted-foreground">
                  Introduz os valores reais para recalcular automaticamente as bolsas.
                </p>
              </div>
              <Button type="button" onClick={handleSaveInputs} disabled={isSavingInputs || isLocked}>
                {isSavingInputs ? 'A guardar…' : 'Guardar alterações'}
              </Button>
            </div>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveInputs();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="input-income-base">Recebido na conta (€)</Label>
                <Input
                  id="input-income-base"
                  type="number"
                  step="0.01"
                  value={formValues.incomeBase}
                  onChange={handleInputChange('incomeBase')}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="input-meal-card">Recebido no cartão refeição (€)</Label>
                <Input
                  id="input-meal-card"
                  type="number"
                  step="0.01"
                  value={formValues.mealCard}
                  onChange={handleInputChange('mealCard')}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="input-extra">Entradas extra (€)</Label>
                <Input
                  id="input-extra"
                  type="number"
                  step="0.01"
                  value={formValues.incomeExtra}
                  onChange={handleInputChange('incomeExtra')}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="input-fixed">Despesas fixas reais (€)</Label>
                <Input
                  id="input-fixed"
                  type="number"
                  step="0.01"
                  value={formValues.fixedExpenses}
                  onChange={handleInputChange('fixedExpenses')}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="input-food">Despesas de comida (€)</Label>
                <Input
                  id="input-food"
                  type="number"
                  step="0.01"
                  value={formValues.foodExpenses}
                  onChange={handleInputChange('foodExpenses')}
                  disabled={isLocked}
                />
              </div>
            </form>
          </Card>

          <Card className="space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Bolsas deste mês</h2>
              <p className="text-sm text-muted-foreground">Disponível: {formatCurrency(bucketSummary.account.remainingPlan)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {bucketCards.map((card) => {
                const plan = card.plan ?? 0;
                const actual = card.actual ?? 0;
                const remaining = card.remaining ?? 0;
                const progress = plan > 0 ? Math.min((actual / plan) * 100, 180) : actual > 0 ? 100 : 0;
                const actionDisabled =
                  isLocked || !card.action?.defaults ||
                  (card.action.type === 'expense' && !card.action.defaults.accountFromId) ||
                  (card.action.type !== 'expense' && (!card.action.defaults.accountFromId || !card.action.defaults.accountToId));

                return (
                  <div key={card.id} className="rounded-xl border border-muted/60 bg-muted/10 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                      </div>
                      {card.action && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          disabled={actionDisabled}
                          onClick={() =>
                            openMovementDialogWithDefaults(card.action!.type, card.action!.defaults)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Planeado</span>
                        <span className="font-medium text-foreground">{formatCurrency(plan)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Real</span>
                        <span className="font-medium text-foreground">{formatCurrency(actual)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Falta</span>
                        <span className={`font-medium ${remaining < 0 ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {suggestions.length > 0 && (
            <Card className="space-y-3 border border-primary/20 bg-primary/5 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-foreground">Sugestões para poupar mais</h2>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border border-primary/20 bg-background/80 p-3 text-sm">
                    {suggestion.message}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Despesa rápida</h2>
                <p className="text-sm text-muted-foreground">Regista um gasto simples em três toques.</p>
              </div>
            </div>
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={handleQuickExpenseSubmit}
            >
              <div className="space-y-1">
                <Label htmlFor="quick-amount">Valor (€)</Label>
                <Input
                  id="quick-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quickAmount}
                  onChange={(event) => setQuickAmount(event.target.value)}
                  disabled={isLocked}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={quickCategory} onValueChange={setQuickCategory} disabled={isLocked}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickExpenseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Conta</Label>
                <Select value={quickAccount} onValueChange={setQuickAccount} disabled={isLocked}>
                  <SelectTrigger>
                    <SelectValue placeholder="Conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={isQuickSaving || isLocked}>
                  {isQuickSaving ? 'A registar…' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-foreground">Movimentos recentes</h2>
              <Select value={movementFilter} onValueChange={setMovementFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  {movementFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {recentMovements.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">
                  Ainda não registaste movimentos com este filtro.
                </p>
              ) : (
                recentMovements.map((movement) => {
                  const Icon = categoryIcons[movement.type];
                  const accountFrom = accounts.find((account) => account.id === movement.accountFromId);
                  const accountTo = accounts.find((account) => account.id === movement.accountToId);

                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-muted/40 bg-muted/10 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            movement.type === 'income'
                              ? 'bg-success/10 text-success'
                              : movement.type === 'expense'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {categoryLabels[movement.category] ?? movement.category}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(movement.date), 'dd MMM', { locale: pt })}</span>
                            {movement.type === 'transfer' && accountFrom && accountTo && (
                              <>
                                <span>• {accountFrom.name}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span>{accountTo.name}</span>
                              </>
                            )}
                            {movement.type === 'expense' && accountFrom && <span>• {accountFrom.name}</span>}
                            {movement.type === 'income' && accountTo && <span>• {accountTo.name}</span>}
                          </div>
                          {movement.note && (
                            <p className="text-xs text-muted-foreground">{movement.note}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-semibold ${
                            movement.type === 'income' ? 'text-success' : 'text-foreground'
                          }`}
                        >
                          {movement.type === 'income' ? '+' : '-'}
                          {formatCurrency(movement.amount)}
                        </div>
                        {!isLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMovement(movement.id)}
                            disabled={isDeletingMovement && movementActionId === movement.id}
                          >
                            {isDeletingMovement && movementActionId === movement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      <Button
        type="button"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg"
        onClick={() => openMovementDialogWithDefaults('expense', { accountFromId: accountTypeMap.current })}
        disabled={isLocked}
      >
        <Plus className="h-5 w-5" /> Movimento
      </Button>

      <MovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
        type={movementDialogType}
        accounts={accounts}
        onSave={handleMovementDialogSave}
        defaults={movementDialogDefaults}
      />

      <CardFundingDialog
        open={cardFundingDialogOpen}
        onOpenChange={setCardFundingDialogOpen}
        defaultBaseAmount={month.incomeBase ?? 0}
        defaultMealAmount={month.incomeMealCard ?? 0}
        onSave={async ({ incomeBase, mealCard }) => {
          await persistMonthInputs(
            {
              incomeBase,
              mealCard,
              incomeExtra: month.subsidyApplied ? month.subsidyAmount ?? 0 : month.incomeExtraordinary ?? 0,
              fixedExpenses: month.actualFixedExpenses ?? month.fixedExpenses ?? 0,
              foodExpenses: month.actualFoodExpenses ?? month.plannedFood ?? 0,
            },
            {
              successMessage: {
                title: 'Recebimentos atualizados',
                description: 'Recalculámos o plano com os novos saldos.',
              },
            },
          );
        }}
      />

      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preparar mês em 1 minuto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {wizardStep === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Introduz o que entrou na tua conta neste início de mês.
                </p>
                <div className="space-y-1">
                  <Label>Recebido na conta (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={wizardValues.incomeBase.toString()}
                    onChange={(event) =>
                      setWizardValues((prev) => ({
                        ...prev,
                        incomeBase: parseInputValue(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            )}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Agora indica o saldo do cartão refeição e entradas extra deste mês.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Cartão refeição (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wizardValues.mealCard.toString()}
                      onChange={(event) =>
                        setWizardValues((prev) => ({
                          ...prev,
                          mealCard: parseInputValue(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Entradas extra (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wizardValues.incomeExtra.toString()}
                      onChange={(event) =>
                        setWizardValues((prev) => ({
                          ...prev,
                          incomeExtra: parseInputValue(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ajusta as despesas fixas e alimentação reais deste mês.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Despesas fixas (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wizardValues.fixedExpenses.toString()}
                      onChange={(event) =>
                        setWizardValues((prev) => ({
                          ...prev,
                          fixedExpenses: parseInputValue(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Despesas de comida (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={wizardValues.foodExpenses.toString()}
                      onChange={(event) =>
                        setWizardValues((prev) => ({
                          ...prev,
                          foodExpenses: parseInputValue(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            {wizardStep === 3 && wizardPreview && wizardPreviewDistribution && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Revê e ajusta as metas antes de começares o mês.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'savings', label: 'Poupança', field: 'savings' as const },
                    { key: 'cryptoCore', label: 'Crypto Core', field: 'cryptoCore' as const },
                    { key: 'shitMoney', label: 'Shit Money', field: 'shitMoney' as const },
                    { key: 'leisure', label: 'Lazer', field: 'leisure' as const },
                    { key: 'buffer', label: 'Buffer', field: 'buffer' as const },
                  ].map((item) => (
                    <div key={item.key} className="space-y-1">
                      <Label>{item.label} (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={wizardValues.overrides[item.field].toString()}
                        onChange={(event) =>
                          setWizardValues((prev) => ({
                            ...prev,
                            overrides: {
                              ...prev.overrides,
                              [item.field]: parseInputValue(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-muted/50 bg-muted/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumo automático</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Disponível</p>
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(wizardPreviewDistribution.availableCash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cartão refeição</p>
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(wizardPreviewDistribution.mealCardBudget)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Passo {wizardStep + 1} de 4</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleWizardPrevious} disabled={wizardStep === 0}>
                Anterior
              </Button>
              {wizardStep < 3 ? (
                <Button type="button" onClick={handleWizardNext}>
                  Seguinte
                </Button>
              ) : (
                <Button type="button" onClick={() => void handleWizardApply()} disabled={isWizardSubmitting}>
                  {isWizardSubmitting ? 'A aplicar…' : 'Aplicar plano'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
