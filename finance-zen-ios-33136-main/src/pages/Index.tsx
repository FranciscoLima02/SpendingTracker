import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { MovementDialog } from "@/components/MovementDialog";
import { getDB, initializeDefaultData, Month, Account, AccountBalance, Movement, AppSettings } from "@/lib/db";
import { 
  calculateFaltaGastar, 
  calculateSavingsProgress, 
  calculateIncomeTotal,
  calculatePlannedExpenses,
  calculatePlannedAvailable,
  calculateTargets,
  calculateRealTotals
} from "@/lib/calculations";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Month | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementDialogType, setMovementDialogType] = useState<'expense' | 'transfer' | 'income'>('expense');
  const { toast } = useToast();

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      await initializeDefaultData();
      const db = await getDB();

      // Load settings
      const loadedSettings = await db.get('settings', 'default');
      setSettings(loadedSettings || null);

      // Load accounts
      const loadedAccounts = await db.getAll('accounts');
      setAccounts(loadedAccounts);

      // Get or create current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let monthData = await db.getFromIndex('months', 'by-year-month', [year, month]);
      
      if (!monthData && loadedSettings) {
        // Create new month from settings
        monthData = {
          id: crypto.randomUUID(),
          year,
          month,
          isClosed: false,
          incomeBase: loadedSettings.monthlyIncomeBase,
          fixedExpenses: loadedSettings.fixedExpenses,
          foodSeparate: loadedSettings.foodSeparate,
          foodPlanned: loadedSettings.foodPlanned,
          subsidyApplied: false,
          subsidyAmount: loadedSettings.subsidyAmount,
          distributionCore: loadedSettings.distributionDefaultCore,
          distributionShit: loadedSettings.distributionDefaultShit,
          distributionSavings: loadedSettings.distributionDefaultSavings,
          distributionFun: loadedSettings.distributionDefaultFun,
          distributionBuffer: loadedSettings.distributionDefaultBuffer,
        };
        await db.put('months', monthData);

        // Create initial balances
        for (const account of loadedAccounts) {
          const balance: AccountBalance = {
            id: crypto.randomUUID(),
            accountId: account.id,
            forMonthYear: year,
            forMonthMonth: month,
            openingBalance: 0,
            manualCurrentBalance: 0,
          };
          await db.put('balances', balance);
        }
      }

      setCurrentMonth(monthData || null);

      // Load balances for current month
      const loadedBalances = await db.getAllFromIndex('balances', 'by-month', [year, month]);
      setBalances(loadedBalances);

      // Load movements for current month
      const loadedMovements = await db.getAllFromIndex('movements', 'by-month', [year, month]);
      setMovements(loadedMovements);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
    }
  }

  if (isLoading || !currentMonth || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  // Calculate all dashboard metrics
  const faltaGastar = calculateFaltaGastar(currentMonth, movements);
  const targets = calculateTargets(currentMonth);
  const reals = calculateRealTotals(movements);
  const savingsProgress = calculateSavingsProgress(currentMonth, movements);
  
  const totalSpending = movements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);

  const dashboardBalances = accounts.map(account => {
    const balance = balances.find(b => b.accountId === account.id);
    return {
      name: account.name,
      balance: balance?.manualCurrentBalance || 0,
    };
  });

  const monthNumbers = {
    incomeTotal: calculateIncomeTotal(currentMonth),
    plannedExpenses: calculatePlannedExpenses(currentMonth),
    plannedAvailable: calculatePlannedAvailable(currentMonth),
    totalSpending,
    savingsReal: reals.savings,
  };

  async function handleSaveMovement(movement: Partial<Movement>) {
    try {
      const db = await getDB();
      const newMovement: Movement = {
        id: crypto.randomUUID(),
        ...movement,
      } as Movement;

      await db.put('movements', newMovement);
      setMovements([...movements, newMovement]);

      toast({
        title: "Movimento adicionado",
        description: "O movimento foi registado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o movimento",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dashboard
        faltaGastar={faltaGastar}
        funTarget={targets.fun}
        savingsReal={reals.savings}
        savingsTarget={targets.savings}
        savingsProgress={savingsProgress}
        balances={dashboardBalances}
        monthNumbers={monthNumbers}
        isClosed={currentMonth.isClosed}
        onAddExpense={() => {
          setMovementDialogType('expense');
          setMovementDialogOpen(true);
        }}
        onAddTransfer={() => {
          setMovementDialogType('transfer');
          setMovementDialogOpen(true);
        }}
        onCloseMonth={() => {
          toast({
            title: "Fechar mês",
            description: "Funcionalidade em desenvolvimento",
          });
        }}
      />
      
      <MovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
        type={movementDialogType}
        accounts={accounts}
        onSave={handleSaveMovement}
      />
    </>
  );
};

export default Index;
