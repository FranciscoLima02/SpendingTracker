import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, TrendingUp, TrendingDown, ArrowDownUp } from "lucide-react";
import { getDB, Month, Movement, Account } from "@/lib/db";
import { calculateTargets, calculateRealTotals, formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const categoryIcons: Record<string, any> = {
  income: TrendingUp,
  expense: TrendingDown,
  transfer: ArrowDownUp,
};

const categoryLabels: Record<string, string> = {
  renda: "Renda",
  contas: "Contas",
  comida: "Comida",
  lazer: "Lazer",
  transporte: "Transporte",
  saude: "Saúde",
  compras: "Compras",
  transferenciaPoupanca: "Transferência Poupança",
  compraCryptoCore: "Crypto Core",
  compraCryptoShit: "Crypto Shit",
  buffer: "Buffer",
  outrosRendimentos: "Outros Rendimentos",
  outrosGastos: "Outros Gastos",
};

export default function Mes() {
  const [month, setMonth] = useState<Month | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

  const targets = calculateTargets(month);
  const reals = calculateRealTotals(movements);

  const buckets = [
    { name: "Core", target: targets.core, real: reals.core, color: "bg-primary" },
    { name: "Shit", target: targets.shit, real: reals.shit, color: "bg-warning" },
    { name: "Poupança", target: targets.savings, real: reals.savings, color: "bg-success" },
    { name: "Lazer", target: targets.fun, real: reals.fun, color: "bg-accent" },
    { name: "Buffer", target: targets.buffer, real: reals.buffer, color: "bg-secondary" },
  ];

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

        {/* Budget Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Progresso do Orçamento</h3>
          <div className="space-y-4">
            {buckets.map((bucket) => {
              const percentage = bucket.target > 0 ? (bucket.real / bucket.target) * 100 : 0;
              const isOverBudget = percentage > 100;

              return (
                <div key={bucket.name} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-foreground">{bucket.name}</span>
                    <div className="text-sm">
                      <span className={isOverBudget ? "text-destructive font-bold" : "text-foreground"}>
                        {formatCurrency(bucket.real)}
                      </span>
                      <span className="text-muted-foreground"> / {formatCurrency(bucket.target)}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={Math.min(percentage, 100)} className="h-3" />
                    {isOverBudget && (
                      <div className="absolute top-0 left-0 h-3 bg-destructive rounded-full opacity-30" 
                           style={{ width: `${Math.min(percentage, 150)}%` }} />
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isOverBudget ? "text-destructive font-semibold" : "text-muted-foreground"}>
                      {percentage.toFixed(0)}%
                    </span>
                    {bucket.target > bucket.real && (
                      <span className="text-success">Falta: {formatCurrency(bucket.target - bucket.real)}</span>
                    )}
                    {isOverBudget && (
                      <span className="text-destructive">Excesso: {formatCurrency(bucket.real - bucket.target)}</span>
                    )}
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
