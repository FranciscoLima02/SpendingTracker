import { Home, Calendar, Wallet, Settings as SettingsIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Navigation() {
  const location = useLocation();

  const links = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/mes", icon: Calendar, label: "Mês" },
    { to: "/contas", icon: Wallet, label: "Contas" },
    { to: "/definicoes", icon: SettingsIcon, label: "Definições" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-around px-2 py-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
