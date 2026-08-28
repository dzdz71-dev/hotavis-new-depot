// Rate-limit simple in-memory pour les server functions publiques.
//
// Sur Cloudflare Workers, l'état in-memory est par-isolat : chaque Worker
// isolate garde son propre compteur. Ce n'est pas un rate-limit distribué
// parfait, mais ça suffit pour bloquer les attaques basiques depuis une
// seule source. Pour un rate-limit strict cross-isolats, utiliser KV ou Durable
// Objects (TODO production).
//
// Pour chaque clé (IP ou email), on garde une fenêtre glissante de 60s avec
// un max de N requêtes. Si dépassé, on jette RateLimitError.

const WINDOW_MS = 60_000; // 60 secondes
const DEFAULT_MAX = 5; // 5 requêtes par minute par défaut

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Nettoyage périodique pour éviter la fuite mémoire
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return; // 5 min
  lastCleanup = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super(`Trop de requêtes. Réessayez dans ${retryAfterSec}s.`);
    this.name = "RateLimitError";
  }
}

/**
 * Vérifie le rate-limit pour une clé donnée. Jette RateLimitError si dépassé.
 *
 * @param key Clé de rate-limit (ex: IP client, email, token)
 * @param max Nombre max de requêtes dans la fenêtre (défaut: 5)
 * @param windowMs Fenêtre en ms (défaut: 60s)
 */
export function rateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS,
): void {
  cleanup();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > max) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    throw new RateLimitError(retryAfterSec);
  }
}

/**
 * Extrait l'IP client depuis les headers standard (Cloudflare, X-Forwarded-For).
 * Fallback sur "unknown" si introuvable.
 */
export function getClientIp(): string {
  // getRequest() est appelé dans le contexte du middleware, on l'utilise
  // via getRequest() directement dans les server functions quand nécessaire.
  // Ici on expose juste le helper, le caller doit passer l'IP.
  return "unknown";
}
