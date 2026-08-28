import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, FolderOpen, Wallet, BookOpen } from "lucide-react";

const ITEMS = [
  { to: "/agent", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/agent/market", label: "Marché des missions", icon: Store },
  { to: "/agent/cases", label: "Mes Dossiers", icon: FolderOpen },
  { to: "/agent/revenue", label: "Mes Revenus", icon: Wallet },
  { to: "/agent/rules", label: "Règles du jeu", icon: BookOpen },
];

export function AgentNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible px-4 lg:px-2 py-2 lg:py-4 bg-card border-b lg:border-b-0 lg:border-r border-border">
      {ITEMS.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-google-blue/10 text-google-blue"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
