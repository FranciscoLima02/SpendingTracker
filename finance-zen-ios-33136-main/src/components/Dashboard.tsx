import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import {
  IncomeCategoryKey,
  ExpenseCategoryKey,
  TransferCategoryKey,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  TRANSFER_CATEGORY_LABELS,
  formatCurrency,
} from "@/lib/calculations";
import { Account } from "@/lib/db";

interface SummaryMetrics {
  openingBalance: number;
  plannedIncomeTotal: number;
  plannedOutflowTotal: number;
  plannedAvailable: number;
  actualIncomeTotal: number;
  actualExpenseTotal: number;
  actualTransferTotal: number;
  cashFlow: number;
  savingsPlanned: number;
  savingsActual: number;
  savingsProgress: number;
  essentialShare: number;
  funShare: number;
  cryptoShare: number;
  fixedExpenses: number;
  variableExpenses: number;
}

interface DashboardProps {
  monthName: string;
  summary: SummaryMetrics;
  incomePlan: Record<IncomeCategoryKey, number>;
  incomeActual: Record<IncomeCategoryKey, number>;
  expensePlan: Record<ExpenseCategoryKey, number>;
  expenseActual: Record<ExpenseCategoryKey, number>;
  transferPlan: Record<TransferCategoryKey, number>;
  transferActual: Record<TransferCategoryKey, number>;
  balances: Array<{ name: string; balance: number; type: Account["type"] }>;
  isClosed: boolean;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddTransfer: () => void;
  onCloseMonth: () => void;
}

function CategoryTable<
  Key extends string,
  Labels extends Record<Key, string>
>({
  labels,
  planned,
  actual,
  highlightNegative = false,
}: {
  labels: Labels;
  planned: Record<Key, number>;
  actual: Record<Key, number>;
  highlightNegative?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Object.entries(labels).map(([key, label]) => {
        const plannedValue = planned[key as Key] ?? 0;
        const actualValue = actual[key as Key] ?? 0;
        const progress = plannedValue > 0 ? Math.min((actualValue / plannedValue) * 100, 150) : 0;
        const diff = actualValue - plannedValue;
        const diffLabel = `${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`;
        const isNegative = highlightNegative && diff > 0;

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Planeado: {formatCurrency(plannedValue)}
                </p>
              </div>
              <div className={`text-sm font-semibold ${isNegative ? "text-destructive" : "text-foreground"}`}>
                {formatCurrency(actualValue)}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs">
              <span className={isNegative ? "text-destructive font-medium" : "text-muted-foreground"}>
                Diferença: {diffLabel}
              </span>
              {plannedValue === 0 && actualValue === 0 ? (
                <span className="text-muted-foreground">Sem movimentos</span>
              ) : (
                <span className="text-muted-foreground">
                  {progress.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard({
  monthName,
  summary,
  incomePlan,
  incomeActual,
  expensePlan,
  expenseActual,
  transferPlan,
  transferActual,
  balances,
  isClosed,
  onAddIncome,
  onAddExpense,
  onAddTransfer,
  onCloseMonth,
}: DashboardProps) {
  const cashFlowIsPositive = summary.cashFlow >= 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">{monthName}</p>
          </div>
          {isClosed && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm font-medium">Mês fechado</span>
            </div>
          )}
        </header>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Resumo mensal automático</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4 bg-primary/5 border-primary/10">
              <p className="text-xs uppercase tracking-wide text-primary">Rendimento</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatCurrency(summary.actualIncomeTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Planeado: {formatCurrency(summary.plannedIncomeTotal)}
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-destructive/5 border-destructive/10">
              <p className="text-xs uppercase tracking-wide text-destructive">Saídas</p>
              <p className="text-2xl font-bold text-destructive mt-2">
                {formatCurrency(summary.actualExpenseTotal + summary.actualTransferTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Planeado: {formatCurrency(summary.plannedOutflowTotal)}
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-accent/5 border-accent/10">
              <p className="text-xs uppercase tracking-wide text-accent">Disponível planeado</p>
              <p className="text-2xl font-bold text-accent mt-2">
                {formatCurrency(summary.plannedAvailable)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo inicial: {formatCurrency(summary.openingBalance)}
              </p>
            </div>
            <div
              className={`rounded-lg border p-4 ${cashFlowIsPositive ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"}`}
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash flow do mês</p>
              <p className={`text-2xl font-bold ${cashFlowIsPositive ? "text-success" : "text-warning"} mt-2`}>
                {formatCurrency(summary.cashFlow)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Despesas reais: {formatCurrency(summary.actualExpenseTotal)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Indicadores automáticos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-success" />
                  <p className="text-sm font-medium text-foreground">Poupança vs meta</p>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(summary.savingsActual)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatCurrency(summary.savingsPlanned)}
                  </span>
                </div>
                <Progress value={Math.min(summary.savingsProgress, 150)} className="h-2 mt-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.savingsProgress.toFixed(0)}% da meta atingida
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-muted bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Despesas fixas</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(summary.fixedExpenses)}
                  </p>
                </div>
                <div className="rounded-lg border border-muted bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Despesas variáveis</p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(summary.variableExpenses)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <TrendingDown className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium">% gasto em essenciais</p>
              </div>
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
                <p className="text-2xl font-bold text-primary">{summary.essentialShare.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Renda + contas + comida</p>
              </div>
              <div className="rounded-lg border border-accent/10 bg-accent/5 p-3">
                <p className="text-sm font-medium text-accent">Lazer &amp; Shit Money</p>
                <p className="text-lg font-bold text-accent">{summary.funShare.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-warning/10 bg-warning/5 p-3">
                <p className="text-sm font-medium text-warning">Crypto</p>
                <p className="text-lg font-bold text-warning">{summary.cryptoShare.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Entradas</h2>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <CategoryTable
            labels={INCOME_CATEGORY_LABELS}
            planned={incomePlan}
            actual={incomeActual}
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Despesas essenciais e variáveis</h2>
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <CategoryTable
            labels={EXPENSE_CATEGORY_LABELS}
            planned={expensePlan}
            actual={expenseActual}
            highlightNegative
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Investimentos &amp; Buffer</h2>
            <Wallet className="w-5 h-5 text-warning" />
          </div>
          <CategoryTable
            labels={TRANSFER_CATEGORY_LABELS}
            planned={transferPlan}
            actual={transferActual}
            highlightNegative
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Saldos por conta</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map((account) => (
              <div key={account.name} className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{account.name}</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(account.balance)}</p>
              </div>
            ))}
          </div>
        </Card>

        {!isClosed && (
          <div className="grid md:grid-cols-4 gap-3">
            <Button
              onClick={onAddIncome}
              className="w-full h-14 bg-success text-success-foreground font-semibold shadow-md"
            >
              Nova entrada
            </Button>
            <Button
              onClick={onAddExpense}
              className="w-full h-14 bg-accent text-accent-foreground font-semibold shadow-md"
            >
              Nova despesa
            </Button>
            <Button
              onClick={onAddTransfer}
              variant="outline"
              className="w-full h-14 border-2 font-semibold"
            >
              Nova transferência
            </Button>
            <Button
              onClick={onCloseMonth}
              variant="secondary"
              className="w-full h-14 font-semibold"
            >
              Fechar mês
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
