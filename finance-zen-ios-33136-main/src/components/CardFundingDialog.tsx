import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CardFundingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBaseAmount: number;
  defaultMealAmount: number;
  onSave: (values: { incomeBase: number; mealCard: number }) => Promise<void>;
}

export function CardFundingDialog({
  open,
  onOpenChange,
  defaultBaseAmount,
  defaultMealAmount,
  onSave,
}: CardFundingDialogProps) {
  const [baseAmount, setBaseAmount] = useState<string>("0");
  const [mealAmount, setMealAmount] = useState<string>("0");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBaseAmount(defaultBaseAmount.toString());
      setMealAmount(defaultMealAmount.toString());
    }
  }, [open, defaultBaseAmount, defaultMealAmount]);

  const handleSubmit = async () => {
    const parsedBase = parseFloat(baseAmount) || 0;
    const parsedMeal = parseFloat(mealAmount) || 0;

    setIsSaving(true);
    try {
      await onSave({ incomeBase: parsedBase, mealCard: parsedMeal });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar recebimentos do mês</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="base-income-amount">Recebido na conta (€)</Label>
            <Input
              id="base-income-amount"
              type="number"
              step="0.01"
              min="0"
              value={baseAmount}
              onChange={(event) => setBaseAmount(event.target.value)}
            />
          </div>

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

          <p className="text-xs text-muted-foreground">
            Define aqui os valores que recebeste este mês. A app atualiza os movimentos de
            entrada e o resumo automaticamente.
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
