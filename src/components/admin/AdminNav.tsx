import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutGrid,
  ListOrdered,
  Users,
  Receipt,
  Settings as SettingsIcon,
  UserPlus,
  BarChart3,
} from "lucide-react";

const TABS = [
  { to: "/admin", label: "Commandes", icon: ListOrdered, exact: true },
  { to: "/admin/kanban", label: "Kanban", icon: LayoutGrid },
  { to: "/admin/agents", label: "Agents", icon: Users },
  { to: "/admin/candidatures", label: "Candidatures", icon: UserPlus },
  { to: "/admin/commissions", label: "Commissions", icon: Receipt },
  { to: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
  { to: "/admin/parametres", label: "Paramètres", icon: SettingsIcon },
];

export function AdminNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-3 border-b-2 transition whitespace-nowrap ${active ? "border-google-blue text-google-blue" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
