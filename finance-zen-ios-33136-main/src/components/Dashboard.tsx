import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { Progress } from "@/components/ui/progress";

interface DashboardProps {
  faltaGastar: number;
  funTarget: number;
  savingsReal: number;
  savingsTarget: number;
  savingsProgress: number;
  balances: Array<{ name: string; balance: number }>;
  monthNumbers: {
    incomeTotal: number;
    plannedExpenses: number;
    plannedAvailable: number;
    totalSpending: number;
    savingsReal: number;
  };
  isClosed: boolean;
  onAddExpense: () => void;
  onAddTransfer: () => void;
  onCloseMonth: () => void;
}

export function Dashboard({
  faltaGastar,
  funTarget,
  savingsReal,
  savingsTarget,
  savingsProgress,
  balances,
  monthNumbers,
  isClosed,
  onAddExpense,
  onAddTransfer,
  onCloseMonth,
}: DashboardProps) {
  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          {isClosed && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Mês fechado</span>
            </div>
          )}
        </div>

        {/* Main KPIs */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Falta Gastar Card */}
          <Card className="p-6 bg-gradient-to-br from-accent to-accent/90 text-accent-foreground border-0 shadow-lg">
            <h3 className="text-sm font-medium opacity-90 mb-2">Falta gastar (Lazer)</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{formatCurrency(faltaGastar)}</p>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 opacity-90">
                <span>Gasto</span>
                <span>{formatCurrency(funTarget - faltaGastar)} / {formatCurrency(funTarget)}</span>
              </div>
              <Progress 
                value={funTarget > 0 ? ((funTarget - faltaGastar) / funTarget) * 100 : 0} 
                className="h-2 bg-accent-foreground/20"
              />
            </div>
          </Card>

          {/* Poupança Card */}
          <Card className="p-6 bg-gradient-to-br from-success to-success/90 text-success-foreground border-0 shadow-lg">
            <h3 className="text-sm font-medium opacity-90 mb-2">Poupança</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold">{formatCurrency(savingsReal)}</p>
              <span className="text-sm opacity-90">/ {formatCurrency(savingsTarget)}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 opacity-90">
                <span>Progresso</span>
                <span>{savingsProgress.toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(savingsProgress, 100)} 
                className="h-2 bg-success-foreground/20"
              />
            </div>
          </Card>
        </div>

        {/* Saldos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Saldos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {balances.map((account) => (
              <div key={account.name} className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{account.name}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(account.balance)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Este mês em 5 números */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Este mês em 5 números</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Rendimento</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(monthNumbers.incomeTotal)}</p>
            </div>
            <div className="text-center p-3 bg-destructive/5 rounded-lg border border-destructive/10">
              <p className="text-xs text-muted-foreground mb-1">Despesas Plan.</p>
              <p className="text-sm font-bold text-destructive">{formatCurrency(monthNumbers.plannedExpenses)}</p>
            </div>
            <div className="text-center p-3 bg-accent/5 rounded-lg border border-accent/10">
              <p className="text-xs text-muted-foreground mb-1">Disponível</p>
              <p className="text-sm font-bold text-accent">{formatCurrency(monthNumbers.plannedAvailable)}</p>
            </div>
            <div className="text-center p-3 bg-warning/5 rounded-lg border border-warning/10">
              <p className="text-xs text-muted-foreground mb-1">Total Gasto</p>
              <p className="text-sm font-bold text-warning">{formatCurrency(monthNumbers.totalSpending)}</p>
            </div>
            <div className="text-center p-3 bg-success/5 rounded-lg border border-success/10">
              <p className="text-xs text-muted-foreground mb-1">Poupança</p>
              <p className="text-sm font-bold text-success">{formatCurrency(monthNumbers.savingsReal)}</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {!isClosed && (
          <div className="grid md:grid-cols-3 gap-3">
            <Button 
              onClick={onAddExpense}
              className="w-full h-14 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground font-semibold shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Despesa
            </Button>
            <Button 
              onClick={onAddTransfer}
              variant="outline"
              className="w-full h-14 border-2 font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Transferência
            </Button>
            <Button 
              onClick={onCloseMonth}
              variant="secondary"
              className="w-full h-14 font-semibold"
            >
              <Lock className="w-5 h-5 mr-2" />
              Fechar Mês
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
