import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset : on ne peut pas vraiment reset le Map interne, donc on utilise
    // des clés uniques par test pour éviter les interférences.
  });

  it("autorise jusqu'à N requêtes dans la fenêtre", () => {
    const key = `test-allow-${Date.now()}-${Math.random()}`;
    expect(() => rateLimit(key, 3, 60_000)).not.toThrow();
    expect(() => rateLimit(key, 3, 60_000)).not.toThrow();
    expect(() => rateLimit(key, 3, 60_000)).not.toThrow();
  });

  it("jette RateLimitError au-delà du seuil", () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    expect(() => rateLimit(key, 2, 60_000)).toThrow(RateLimitError);
    expect(() => rateLimit(key, 2, 60_000)).toThrow(/Trop de requêtes/);
  });

  it("le message d'erreur contient le retryAfterSec", () => {
    const key = `test-msg-${Date.now()}-${Math.random()}`;
    rateLimit(key, 1, 60_000);
    try {
      rateLimit(key, 1, 60_000);
      expect.fail("Devait jeter RateLimitError");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      const err = e as RateLimitError;
      expect(err.retryAfterSec).toBeGreaterThan(0);
      expect(err.retryAfterSec).toBeLessThanOrEqual(60);
      expect(err.message).toMatch(/Réessayez dans \d+s/);
    }
  });
});
