import { getRequest } from "@tanstack/react-start/server";

/**
 * Build a rate-limit key based on the client's IP address.
 * This function must be in a .server.ts file to avoid client-side import issues
 * with @tanstack/react-start/server.
 */
export function buildRateLimitKey(): string {
  try {
    const req = getRequest();
    if (!req) return "no-req";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfIp = (req as any).cf?.ipCountry as string | undefined;
    const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = xff || cfIp || "unknown";
    return `cmd:${ip}`;
  } catch {
    return "cmd:unknown";
  }
}
