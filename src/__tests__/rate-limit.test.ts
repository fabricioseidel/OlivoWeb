import { describe, it, expect } from "vitest";
import { rateLimit, getClientIp } from "../lib/rate-limit";

describe("rateLimit", () => {
  it("permite hasta el límite y bloquea después", () => {
    const key = `test-${Date.now()}-block`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    }
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("usa contadores independientes por clave", () => {
    const a = `test-${Date.now()}-a`;
    const b = `test-${Date.now()}-b`;
    rateLimit(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("se reinicia al expirar la ventana", async () => {
    const key = `test-${Date.now()}-expire`;
    rateLimit(key, { limit: 1, windowMs: 50 });
    expect(rateLimit(key, { limit: 1, windowMs: 50 }).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit(key, { limit: 1, windowMs: 50 }).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("devuelve unknown sin header", () => {
    expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
