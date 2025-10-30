import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  PlusCircle,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import {
  getDB,
  Month,
  Movement,
  Account,
  AppSettings,
  createMonthWithDefaults,
  initializeDefaultData,
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
} from "@/lib/calculations";
import { normalizeMonth, getNextMonth } from "@/lib/month-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

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
      const [monthMovements] = await Promise.all([
        db.getAllFromIndex('movements', 'by-month', [normalized.year, normalized.month]),
      ]);

      setSelectedMonthId(normalized.id);
      setMonth(normalized);
      setMovements(monthMovements);
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
  }, [month]);

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

  async function handleSaveInputs() {
    if (!month) return;
    if (month.isClosed) {
      toast({
        title: 'Mês fechado',
        description: 'Reabre o mês para atualizares os valores.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingInputs(true);
      const db = await getDB();

      const incomeBase = parseInputValue(formValues.incomeBase);
      const mealCard = parseInputValue(formValues.mealCard);
      const incomeExtra = parseInputValue(formValues.incomeExtra);
      const fixedReal = parseInputValue(formValues.fixedExpenses);
      const foodReal = parseInputValue(formValues.foodExpenses);

      const monthDraft: Month = {
        ...month,
        incomeBase,
        incomeMealCard: mealCard,
        incomeExtraordinary: incomeExtra,
        actualFixedExpenses: fixedReal,
        actualFoodExpenses: foodReal,
      };

      if (isSubsidyMonth(month) && incomeExtra > 0) {
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

      const monthKey: [number, number] = [recalculated.year, recalculated.month];
      let monthMovements = await db.getAllFromIndex('movements', 'by-month', monthKey);

      const upsertIncome = async (
        category: 'incomeSalary' | 'incomeMealCard' | 'incomeExtraordinary' | 'incomeSubsidy',
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
          const defaultDate = existing?.date ?? new Date(recalculated.year, recalculated.month - 1, 1);
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
              id: crypto.randomUUID(),
              date: defaultDate,
              type: 'income',
              amount,
              category,
              accountToId,
              isSubsidyTagged: category === 'incomeSubsidy',
              monthYear: recalculated.year,
              monthMonth: recalculated.month,
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

      await upsertIncome('incomeSalary', incomeBase, accountMap['current']);
      await upsertIncome('incomeMealCard', mealCard, accountMap['mealCard']);

      if (recalculated.subsidyApplied) {
        await upsertIncome('incomeSubsidy', recalculated.subsidyAmount ?? 0, accountMap['current']);
        await upsertIncome('incomeExtraordinary', 0, accountMap['current']);
      } else {
        await upsertIncome('incomeExtraordinary', recalculated.incomeExtraordinary ?? 0, accountMap['current']);
        await upsertIncome('incomeSubsidy', 0, accountMap['current']);
      }

      const refreshedMovements = await db.getAllFromIndex('movements', 'by-month', monthKey);
      setMonth(normalizedMonth);
      upsertMonthInState(normalizedMonth);
      setMovements(refreshedMovements);

      toast({
        title: 'Entradas do mês atualizadas',
        description: 'Recalculámos as metas e saldos automaticamente.',
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

  const isLocked = month.isClosed;
  const monthName = format(new Date(month.year, month.month - 1), "MMMM yyyy", { locale: pt });
  const monthNameFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const plannedIncome = calculatePlannedIncome(month);
  const actualIncome = calculateActualIncome(movements);
  const plannedExpenses = calculatePlannedExpenses(month);
  const actualExpenses = calculateActualExpenses(movements);
  const plannedTransfers = calculatePlannedTransfers(month);
  const actualTransfers = calculateActualTransfers(movements);

  const summary = {
    plannedIncomeTotal: calculatePlannedIncomeTotal(month),
    plannedOutflows: calculatePlannedOutflows(month),
    plannedAvailable: calculatePlannedAvailable(month),
    actualIncomeTotal: sumRecord(actualIncome),
    actualExpensesTotal: sumRecord(actualExpenses),
    actualTransfersTotal: sumRecord(actualTransfers),
    cashFlow: calculateCashFlow(month, movements),
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestão de meses</h1>
              <p className="text-muted-foreground">Seleciona um mês para rever entradas, objetivos e ajustes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={selectedMonthId ?? month.id} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Escolhe um mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((item) => {
                    const label = format(new Date(item.year, item.month - 1), "MMMM yyyy", { locale: pt });
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        {label.charAt(0).toUpperCase() + label.slice(1)} {item.isClosed ? '· Fechado' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Badge variant={isLocked ? 'outline' : 'secondary'} className="w-fit">
                {isLocked ? 'Fechado' : 'Aberto'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{monthNameFormatted}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleCreateNextMonth} disabled={isCreatingMonth} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              {isCreatingMonth ? 'A criar…' : 'Criar próximo mês'}
            </Button>
            <Button
              onClick={isLocked ? handleReopenMonth : handleCloseCurrentMonth}
              disabled={isTogglingStatus}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
              {isTogglingStatus ? 'A processar…' : isLocked ? 'Reabrir mês' : 'Fechar mês'}
            </Button>
            <Button
              onClick={handleDeleteMonth}
              disabled={isDeletingMonth}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletingMonth ? 'A apagar…' : 'Apagar mês'}
            </Button>
          </div>
        </div>

        {isLocked && (
          <Card className="border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-primary">Este mês está fechado.</p>
                <p className="text-sm text-primary/80">
                  Reabre-o para editares valores ou regista novos movimentos no dashboard.
                </p>
              </div>
              <Button variant="outline" onClick={handleReopenMonth} disabled={isTogglingStatus}>
                <Unlock className="mr-2 h-4 w-4" /> Reabrir mês
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Inputs rápidos do mês</h3>
              <p className="text-sm text-muted-foreground">
                Introduz as entradas reais e despesas fixas. Guardamos tudo offline e recalculamos as metas das bolsas automaticamente.
              </p>
            </div>
            <Button onClick={handleSaveInputs} disabled={isSavingInputs || isLocked}>
              {isSavingInputs ? 'A guardar…' : 'Guardar alterações'}
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="input-extra">Recebido extra (subsídio, bónus, devoluções) (€)</Label>
              <Input
                id="input-extra"
                type="number"
                step="0.01"
                value={formValues.incomeExtra}
                onChange={handleInputChange('incomeExtra')}
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="input-food">Despesas reais de comida (€)</Label>
              <Input
                id="input-food"
                type="number"
                step="0.01"
                value={formValues.foodExpenses}
                onChange={handleInputChange('foodExpenses')}
                disabled={isLocked}
              />
            </div>
          </div>

          {isSubsidyMonth(month) && (
            <p className="mt-4 text-xs text-muted-foreground">
              Junho e dezembro aplicam automaticamente a distribuição especial do subsídio quando inseres um valor extra.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Resumo automático</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
              <p className="text-xs text-primary uppercase tracking-wide">Rendimento</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatCurrency(summary.actualIncomeTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Planeado: {formatCurrency(summary.plannedIncomeTotal)}
              </p>
            </div>
            <div className="rounded-lg border border-destructive/10 bg-destructive/5 p-4">
              <p className="text-xs text-destructive uppercase tracking-wide">Saídas (despesas + transferências)</p>
              <p className="text-2xl font-bold text-destructive mt-2">
                {formatCurrency(summary.actualExpensesTotal + summary.actualTransfersTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Planeado: {formatCurrency(summary.plannedOutflows)}
              </p>
            </div>
            <div className="rounded-lg border border-accent/10 bg-accent/5 p-4">
              <p className="text-xs text-accent uppercase tracking-wide">Disponível planeado</p>
              <p className="text-2xl font-bold text-accent mt-2">
                {formatCurrency(summary.plannedAvailable)}
              </p>
            </div>
            <div className="rounded-lg border border-success/10 bg-success/5 p-4">
              <p className="text-xs text-success uppercase tracking-wide">Cash flow do mês</p>
              <p className="text-2xl font-bold text-success mt-2">
                {formatCurrency(summary.cashFlow)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Metas automáticas das bolsas</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponível para distribuir</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(monthDistribution.availableCash)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo em dinheiro após despesas fixas ({formatCurrency(month.actualFixedExpenses ?? month.fixedExpenses ?? 0)} + comida {formatCurrency(month.actualFoodExpenses ?? month.plannedFood ?? 0)}).
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cartão refeição</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(monthDistribution.mealCardBudget)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Saldo planeado para comida via cartão.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Poupança</p>
              <p className="text-xl font-semibold text-success mt-1">
                {formatCurrency(month.plannedSavings ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Inclui metas base e subsídio quando existir.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Crypto (Core)</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {formatCurrency(month.plannedCryptoCore ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Distribuição automática para o núcleo.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Shit Money</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {formatCurrency(month.plannedShitMoney ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Limite mensal para gasto impulsivo.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lazer</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {formatCurrency(month.plannedLeisure ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Eventos, cafés e diversão planeada.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Buffer / Conta</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {formatCurrency(month.plannedBuffer ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Reserva de segurança para a conta.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Entradas</h3>
          <div className="space-y-3">
            {Object.entries(INCOME_CATEGORY_LABELS).map(([key, label]) => {
              const planned = plannedIncome[key as keyof typeof plannedIncome] ?? 0;
              const actual = actualIncome[key as keyof typeof actualIncome] ?? 0;
              const progress = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
              const diff = actual - planned;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{formatCurrency(planned)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Real: {formatCurrency(actual)}</span>
                    <span>{diff >= 0 ? "+" : ""}{formatCurrency(diff)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Despesas</h3>
          <div className="space-y-3">
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => {
              const planned = plannedExpenses[key as keyof typeof plannedExpenses] ?? 0;
              const actual = actualExpenses[key as keyof typeof actualExpenses] ?? 0;
              const progress = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
              const diff = planned - actual;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{formatCurrency(planned)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Real: {formatCurrency(actual)}</span>
                    <span>{diff <= 0 ? `+${formatCurrency(Math.abs(diff))}` : `Falta ${formatCurrency(diff)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Investimentos &amp; Buffer</h3>
          <div className="space-y-3">
            {Object.entries(TRANSFER_CATEGORY_LABELS).map(([key, label]) => {
              const planned = plannedTransfers[key as keyof typeof plannedTransfers] ?? 0;
              const actual = actualTransfers[key as keyof typeof actualTransfers] ?? 0;
              const progress = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
              const diff = planned - actual;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{formatCurrency(planned)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Real: {formatCurrency(actual)}</span>
                    <span>{diff <= 0 ? `+${formatCurrency(Math.abs(diff))}` : `Falta ${formatCurrency(diff)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Movements List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Movimentos</h3>
            <span className="text-sm text-muted-foreground">{movements.length} registos</span>
          </div>
          
          <div className="space-y-2">
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ainda não há movimentos este mês</p>
            ) : (
              movements
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((mov) => {
                  const Icon = categoryIcons[mov.type];
                  const accountFrom = accounts.find(a => a.id === mov.accountFromId);
                  const accountTo = accounts.find(a => a.id === mov.accountToId);

                  return (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          mov.type === 'income' ? 'bg-success/10 text-success' :
                          mov.type === 'expense' ? 'bg-destructive/10 text-destructive' :
                          'bg-accent/10 text-accent'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {categoryLabels[mov.category] || mov.category}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(mov.date), "dd MMM", { locale: pt })}</span>
                            {mov.type === 'transfer' && accountFrom && accountTo && (
                              <>
                                <span>•</span>
                                <span>{accountFrom.name}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span>{accountTo.name}</span>
                              </>
                            )}
                            {mov.type === 'expense' && accountFrom && (
                              <>
                                <span>•</span>
                                <span>{accountFrom.name}</span>
                              </>
                            )}
                            {mov.type === 'income' && accountTo && (
                              <>
                                <span>•</span>
                                <span>{accountTo.name}</span>
                              </>
                            )}
                          </div>
                          {mov.note && (
                            <p className="text-xs text-muted-foreground mt-1">{mov.note}</p>
                          )}
                        </div>
                      </div>
                      <div className={`font-bold ${
                        mov.type === 'income' ? 'text-success' : 'text-foreground'
                      }`}>
                        {mov.type === 'income' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
