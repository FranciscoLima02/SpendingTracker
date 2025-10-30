import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, TrendingUp, TrendingDown, ArrowDownUp } from "lucide-react";
import { getDB, Month, Movement, Account } from "@/lib/db";
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
} from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [month, setMonth] = useState<Month | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formValues, setFormValues] = useState({
    incomeBase: "0.00",
    mealCard: "0.00",
    incomeExtra: "0.00",
    fixedExpenses: "0.00",
    foodExpenses: "0.00",
  });
  const [isSavingInputs, setIsSavingInputs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

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

  async function loadData() {
    const db = await getDB();
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;

    const monthData = await db.getFromIndex('months', 'by-year-month', [year, monthNum]);
    setMonth(monthData || null);

    const movs = await db.getAllFromIndex('movements', 'by-month', [year, monthNum]);
    setMovements(movs);

    const accs = await db.getAll('accounts');
    setAccounts(accs);
  }

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
      await db.put('months', recalculated);

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
      setMonth(recalculated);
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

  if (!month) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  const monthDistribution = useMemo(() => calculateMonthDistribution(month), [month]);
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mês Atual</h1>
          <p className="text-muted-foreground">
            {format(new Date(month.year, month.month - 1), "MMMM yyyy", { locale: pt })}
          </p>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Inputs rápidos do mês</h3>
              <p className="text-sm text-muted-foreground">
                Introduz as entradas reais e despesas fixas. Guardamos tudo offline e recalculamos as metas das bolsas automaticamente.
              </p>
            </div>
            <Button onClick={handleSaveInputs} disabled={isSavingInputs}>
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
