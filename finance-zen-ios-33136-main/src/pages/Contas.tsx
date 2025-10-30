import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDB, Account, AccountBalance } from "@/lib/db";
import { formatCurrency } from "@/lib/calculations";
import { Wallet, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contas() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const db = await getDB();
    const accs = await db.getAll('accounts');
    setAccounts(accs);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const bals = await db.getAllFromIndex('balances', 'by-month', [year, month]);
    setBalances(bals);
  }

  async function handleSaveBalance(accountId: string) {
    const balance = balances.find(b => b.accountId === accountId);
    if (!balance) return;

    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive",
      });
      return;
    }

    try {
      const db = await getDB();
      await db.put('balances', {
        ...balance,
        manualCurrentBalance: newValue,
      });

      setBalances(prev =>
        prev.map(b =>
          b.accountId === accountId
            ? { ...b, manualCurrentBalance: newValue }
            : b
        )
      );

      setEditingId(null);
      toast({
        title: "Saldo atualizado",
        description: "O saldo foi atualizado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o saldo",
        variant: "destructive",
      });
    }
  }

  const accountIcons: Record<string, string> = {
    current: "💶",
    mealCard: "🍽️",
    savings: "🏦",
    cryptoCore: "₿",
    cryptoShit: "🪙",
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas & Saldos</h1>
          <p className="text-muted-foreground">Gerir saldos das suas contas</p>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          {accounts.map((account) => {
            const balance = balances.find(b => b.accountId === account.id);
            const isEditing = editingId === account.id;

            return (
              <Card key={account.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">
                      {accountIcons[account.type] || <Wallet className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{account.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.type.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 text-right"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="success"
                          onClick={() => handleSaveBalance(account.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditValue("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(balance?.manualCurrentBalance || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Saldo atual</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(account.id);
                            setEditValue((balance?.manualCurrentBalance || 0).toString());
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {balance && !isEditing && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Saldo de abertura</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(balance.openingBalance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Diferença</p>
                      <p className={`font-medium ${
                        balance.manualCurrentBalance - balance.openingBalance >= 0
                          ? 'text-success'
                          : 'text-destructive'
                      }`}>
                        {formatCurrency(balance.manualCurrentBalance - balance.openingBalance)}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-accent/5 border-accent/20">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Os saldos são atualizados manualmente. Clique no ícone de edição para
            ajustar o saldo de qualquer conta.
          </p>
        </Card>
      </div>
    </div>
  );
}
