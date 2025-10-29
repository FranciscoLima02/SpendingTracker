import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Movement, Account } from "@/lib/db";

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'expense' | 'transfer' | 'income';
  accounts: Account[];
  onSave: (movement: Partial<Movement>) => Promise<void>;
}

const categories = {
  income: [
    { value: 'incomeSalary', label: 'Rendimento Base' },
    { value: 'incomeSubsidy', label: 'Subsídio (Jun/Dez)' },
    { value: 'incomeMealCard', label: 'Cartão Refeição' },
    { value: 'incomeCreditCard', label: 'Cartão de Crédito' },
    { value: 'incomeExtraordinary', label: 'Entrada Extraordinária' },
  ],
  expense: [
    { value: 'rent', label: 'Renda' },
    { value: 'utilities', label: 'Contas (Luz, Água, Gás)' },
    { value: 'food', label: 'Comida' },
    { value: 'leisure', label: 'Lazer' },
    { value: 'shitMoney', label: 'Shit Money' },
    { value: 'transport', label: 'Transporte' },
    { value: 'health', label: 'Saúde' },
    { value: 'shopping', label: 'Compras / Necessidades' },
    { value: 'subscriptions', label: 'Trabalho / Subscrições' },
  ],
  transfer: [
    { value: 'transferenciaPoupanca', label: 'Transferência Poupança' },
    { value: 'compraCryptoCore', label: 'Investimento Crypto (Core)' },
    { value: 'compraCryptoShit', label: 'Investimento Crypto (Shit)' },
    { value: 'buffer', label: 'Buffer / Emergência' },
  ],
} as const;

export function MovementDialog({ open, onOpenChange, type, accounts, onSave }: MovementDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [accountFrom, setAccountFrom] = useState("");
  const [accountTo, setAccountTo] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!category) return;
    if (type === 'transfer' && (!accountFrom || !accountTo || accountFrom === accountTo)) return;
    if (type === 'expense' && !accountFrom) return;
    if (type === 'income' && !accountTo) return;

    setIsSubmitting(true);
    try {
      const movement: Partial<Movement> = {
        date,
        type,
        amount: parseFloat(amount),
        category,
        note: note || undefined,
        isSubsidyTagged: false,
        monthYear: date.getFullYear(),
        monthMonth: date.getMonth() + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (type === 'expense') {
        movement.accountFromId = accountFrom;
      } else if (type === 'income') {
        movement.accountToId = accountTo;
      } else {
        movement.accountFromId = accountFrom;
        movement.accountToId = accountTo;
      }

      await onSave(movement);
      
      // Reset form
      setAmount("");
      setCategory("");
      setAccountFrom("");
      setAccountTo("");
      setNote("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabels = {
    expense: 'Despesa',
    transfer: 'Transferência',
    income: 'Entrada',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova {typeLabels[type]}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: pt }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor (€)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount((prev) => (parseFloat(prev || "0") + 10).toString())}
              >
                +10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount((prev) => (parseFloat(prev || "0") + 50).toString())}
              >
                +50
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories[type].map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accounts */}
          {type === 'expense' && (
            <div className="space-y-2">
              <Label>Conta de débito</Label>
              <Select value={accountFrom} onValueChange={setAccountFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'income' && (
            <div className="space-y-2">
              <Label>Conta de crédito</Label>
              <Select value={accountTo} onValueChange={setAccountTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'transfer' && (
            <>
              <div className="space-y-2">
                <Label>De (conta origem)</Label>
                <Select value={accountFrom} onValueChange={setAccountFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Para (conta destino)</Label>
                <Select value={accountTo} onValueChange={setAccountTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label>Nota (opcional)</Label>
            <Textarea
              placeholder="Adicionar nota..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !amount || !category}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
