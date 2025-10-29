import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getDB, AppSettings } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon } from "lucide-react";

export default function Definicoes() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const db = await getDB();
    const data = await db.get('settings', 'default');
    if (data) setSettings(data);
  }

  async function handleSave() {
    if (!settings) return;

    setIsSaving(true);
    try {
      const db = await getDB();
      await db.put('settings', {
        ...settings,
        updatedAt: new Date(),
      });

      toast({
        title: "Definições guardadas",
        description: "As suas definições foram atualizadas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível guardar as definições",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Definições</h1>
          <p className="text-muted-foreground">Configurar o seu orçamento mensal</p>
        </div>

        {/* Base Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <SettingsIcon className="w-5 h-5" />
            Configurações Base
          </h3>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Rendimento mensal base (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.monthlyIncomeBase}
                  onChange={(e) =>
                    setSettings({ ...settings, monthlyIncomeBase: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Despesas fixas (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.fixedExpenses}
                  onChange={(e) =>
                    setSettings({ ...settings, fixedExpenses: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label>Comida separada do orçamento?</Label>
                <p className="text-sm text-muted-foreground">
                  Se ativado, a comida é planeada separadamente
                </p>
              </div>
              <Switch
                checked={settings.foodSeparate}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, foodSeparate: checked })
                }
              />
            </div>

            {settings.foodSeparate && (
              <div className="space-y-2">
                <Label>Comida planeada (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.foodPlanned}
                  onChange={(e) =>
                    setSettings({ ...settings, foodPlanned: parseFloat(e.target.value) })
                  }
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor do subsídio (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.subsidyAmount}
                  onChange={(e) =>
                    setSettings({ ...settings, subsidyAmount: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Dia do pagamento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.paydayDayOfMonth}
                  onChange={(e) =>
                    setSettings({ ...settings, paydayDayOfMonth: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Default Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Distribuição Padrão (%)
          </h3>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Core</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionDefaultCore}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionDefaultCore: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Shit</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionDefaultShit}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionDefaultShit: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Poupança</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionDefaultSavings}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionDefaultSavings: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Lazer</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionDefaultFun}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionDefaultFun: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Buffer</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionDefaultBuffer}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionDefaultBuffer: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Soma atual: {
                (
                  settings.distributionDefaultCore +
                  settings.distributionDefaultShit +
                  settings.distributionDefaultSavings +
                  settings.distributionDefaultFun +
                  settings.distributionDefaultBuffer
                ).toFixed(2)
              } (deve ser 1.00)
            </p>
          </div>
        </Card>

        {/* Subsidy Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Distribuição Subsídio - Jun/Dez (%)
          </h3>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Core</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionSubsidyCore}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionSubsidyCore: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Shit</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionSubsidyShit}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionSubsidyShit: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Poupança</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionSubsidySavings}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionSubsidySavings: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Lazer</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.distributionSubsidyFun}
                  onChange={(e) =>
                    setSettings({ ...settings, distributionSubsidyFun: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Soma atual: {
                (
                  settings.distributionSubsidyCore +
                  settings.distributionSubsidyShit +
                  settings.distributionSubsidySavings +
                  settings.distributionSubsidyFun
                ).toFixed(2)
              } (buffer é 0 nos meses de subsídio)
            </p>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? "A guardar..." : "Guardar Definições"}
        </Button>
      </div>
    </div>
  );
}
