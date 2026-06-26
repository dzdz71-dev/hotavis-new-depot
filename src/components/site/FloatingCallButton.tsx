import { useRouterState } from "@tanstack/react-router";
import { Mail } from "lucide-react";

const HIDDEN_ON = ["/onboarding", "/admin", "/commander"];

export function FloatingCallButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <a
      href="#contact"
      aria-label="Nous contacter via le formulaire"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center justify-center h-14 w-14 rounded-full bg-google-blue text-white shadow-glow hover:scale-105 transition lg:hidden"
    >
      <Mail className="h-6 w-6" />
    </a>
  );
}
