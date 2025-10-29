import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CardFundingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMealAmount: number;
  defaultCreditAmount: number;
  onSave: (values: { mealCard: number; creditCard: number }) => Promise<void>;
}

export function CardFundingDialog({
  open,
  onOpenChange,
  defaultMealAmount,
  defaultCreditAmount,
  onSave,
}: CardFundingDialogProps) {
  const [mealAmount, setMealAmount] = useState<string>("0");
  const [creditAmount, setCreditAmount] = useState<string>("0");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMealAmount(defaultMealAmount.toString());
      setCreditAmount(defaultCreditAmount.toString());
    }
  }, [open, defaultMealAmount, defaultCreditAmount]);

  const handleSubmit = async () => {
    const parsedMeal = parseFloat(mealAmount) || 0;
    const parsedCredit = parseFloat(creditAmount) || 0;

    setIsSaving(true);
    try {
      await onSave({ mealCard: parsedMeal, creditCard: parsedCredit });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar recargas dos cartões</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="meal-card-amount">Cartão de refeição (€)</Label>
            <Input
              id="meal-card-amount"
              type="number"
              step="0.01"
              min="0"
              value={mealAmount}
              onChange={(event) => setMealAmount(event.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="credit-card-amount">Cartão de crédito (€)</Label>
            <Input
              id="credit-card-amount"
              type="number"
              step="0.01"
              min="0"
              value={creditAmount}
              onChange={(event) => setCreditAmount(event.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Define aqui os valores que recebeste este mês. A app atualiza os movimentos
            de entrada e o resumo automaticamente.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
