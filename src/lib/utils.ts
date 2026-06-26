import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Échappe les caractères HTML spéciaux pour insertion sûre dans du HTML
 * (emails HTML, attributs, etc.). Utilisé par toutes les server functions
 * qui construisent du HTML d'email à partir de données utilisateur.
 *
 * @example
 *   escapeHtml("O'Brien & <Co>") // → "O&#39;Brien &amp; &lt;Co&gt;"
 */
export function escapeHtml(s: string): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}
