import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserRoles } from "@/lib/client/roles";
import { AgentNav } from "./AgentNav";

export function AgentLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/agent/login" });
        return;
      }
      const roles = await getUserRoles();
      if (!roles.includes("agent") && !roles.includes("admin")) {
        await supabase.auth.signOut();
        navigate({ to: "/agent/login" });
        return;
      }
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        navigate({ to: "/agent/login" });
        return;
      }
      const roles = await getUserRoles();
      if (!roles.includes("agent") && !roles.includes("admin")) {
        await supabase.auth.signOut();
        navigate({ to: "/agent/login" });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/agent/login" });
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex flex-col">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-block bg-google-blue/15 text-google-blue text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Agent
            </div>
            <h1 className="text-xl font-extrabold">Espace Agent Hotavis</h1>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        <aside className="lg:w-64 shrink-0">
          <AgentNav />
        </aside>
        <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
