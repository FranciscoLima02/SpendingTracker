import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, Target } from "lucide-react";
import { formatCurrency, MonthDistributionTargets, MonthBucketSummary, SavingsSuggestion } from "@/lib/calculations";

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
  isClosed: boolean;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddTransfer: () => void;
  onManageCardFunding: () => void;
  onCloseMonth: () => void;
  distribution: MonthDistributionTargets;
  bucketSummary: MonthBucketSummary;
  suggestions: SavingsSuggestion[];
}

export function Dashboard({
  monthName,
  summary,
  isClosed,
  onAddIncome,
  onAddExpense,
  onAddTransfer,
  onManageCardFunding,
  onCloseMonth,
  distribution,
  bucketSummary,
  suggestions,
}: DashboardProps) {
  const cashFlowIsPositive = summary.cashFlow >= 0;

  const accountInitial = bucketSummary.account.opening + bucketSummary.account.inflow;
  const mealCardInitial = bucketSummary.mealCard.opening + bucketSummary.mealCard.inflow;

  const suggestionToneStyles: Record<SavingsSuggestion["tone"], string> = {
    info: 'bg-accent/10 border-accent/20 text-accent-foreground',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    success: 'bg-success/10 border-success/20 text-success',
  };

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
          <h2 className="text-lg font-semibold mb-4 text-foreground">Conta &amp; Cartão refeição</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conta bancária</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(bucketSummary.account.plan)}</p>
                </div>
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                  <p className="font-semibold text-foreground">{formatCurrency(accountInitial)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gasto</p>
                  <p className="font-semibold text-destructive">{formatCurrency(bucketSummary.account.outflow)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                  <p className="font-semibold text-foreground">{formatCurrency(bucketSummary.account.current)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Falta gastar</p>
                  <p className={`font-semibold ${bucketSummary.account.remainingPlan < 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(bucketSummary.account.remainingPlan)}
                  </p>
                </div>
              </div>
              <Progress
                value={bucketSummary.account.plan > 0 ? Math.min((bucketSummary.account.outflow / bucketSummary.account.plan) * 100, 180) : 0}
                className="h-2"
              />
            </div>
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cartão refeição</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(distribution.mealCardBudget)}</p>
                </div>
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                  <p className="font-semibold text-foreground">{formatCurrency(mealCardInitial)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gasto em comida</p>
                  <p className="font-semibold text-destructive">{formatCurrency(bucketSummary.mealCard.foodSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                  <p className="font-semibold text-foreground">{formatCurrency(bucketSummary.mealCard.current)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                  <p className={`font-semibold ${bucketSummary.mealCard.remainingPlan < 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(bucketSummary.mealCard.remainingPlan)}
                  </p>
                </div>
              </div>
              <Progress
                value={distribution.mealCardBudget > 0 ? Math.min((bucketSummary.mealCard.foodSpent / distribution.mealCardBudget) * 100, 180) : 0}
                className="h-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Bolsas planeadas</h2>
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[{
              label: 'Poupança',
              icon: <PiggyBank className="w-5 h-5 text-success" />,
              bucket: bucketSummary.savings,
            }, {
              label: 'Lazer',
              icon: <TrendingUp className="w-5 h-5 text-accent" />,
              bucket: bucketSummary.leisure,
            }, {
              label: 'Shit Money',
              icon: <TrendingDown className="w-5 h-5 text-destructive" />,
              bucket: bucketSummary.shitMoney,
            }, {
              label: 'Buffer / Conta',
              icon: <Wallet className="w-5 h-5 text-primary" />,
              bucket: bucketSummary.buffer,
            }].map(({ label, icon, bucket }) => {
              const progress = bucket.plan > 0 ? Math.min((bucket.actual / bucket.plan) * 100, 180) : 0;
              const remainingClass = bucket.remaining < 0 ? 'text-destructive' : 'text-muted-foreground';
              return (
                <div key={label} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(bucket.plan)}</p>
                    </div>
                    {icon}
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Executado: {formatCurrency(bucket.actual)}</span>
                    <span className={remainingClass}>Falta: {formatCurrency(bucket.remaining)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Crypto (Core + Shit)</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(bucketSummary.crypto.plan)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Core: {formatCurrency(bucketSummary.crypto.coreActual)} / {formatCurrency(bucketSummary.crypto.corePlan)}</p>
                <p>Shit: {formatCurrency(bucketSummary.crypto.shitActual)} / {formatCurrency(bucketSummary.crypto.shitPlan)}</p>
                <p className={bucketSummary.crypto.remaining < 0 ? 'text-destructive font-semibold' : ''}>
                  Falta investir: {formatCurrency(bucketSummary.crypto.remaining)}
                </p>
              </div>
              <Progress
                value={bucketSummary.crypto.plan > 0 ? Math.min((bucketSummary.crypto.actual / bucketSummary.crypto.plan) * 100, 180) : 0}
                className="h-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Sugestões de poupança deste mês</h2>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`rounded-lg border p-4 text-sm ${suggestionToneStyles[suggestion.tone]}`}
              >
                {suggestion.message}
              </div>
            ))}
          </div>
        </Card>

        {!isClosed && (
          <div className="grid md:grid-cols-5 gap-3">
            <Button
              onClick={onManageCardFunding}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold shadow-md"
            >
              Atualizar cartões
            </Button>
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
