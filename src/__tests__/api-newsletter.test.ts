import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const chain: any = {
  select: vi.fn(() => chain),
  order: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  upsert: vi.fn(() => Promise.resolve({ error: null })),
  update: vi.fn(() => chain),
};
// select/order chain resolves like a promise when awaited directly
chain.then = (resolve: any) => resolve({ data: [], error: null });

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(() => chain),
  },
}));

import { getServerSession } from "next-auth";
import { GET, DELETE } from "../app/api/newsletter/route";
import { unsubscribeToken } from "../lib/newsletter-token";

const mockedGetServerSession = vi.mocked(getServerSession);

describe("/api/newsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  describe("GET", () => {
    it("returns 401 without a session", async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const request = new NextRequest("http://localhost/api/newsletter");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 for a SELLER session", async () => {
      mockedGetServerSession.mockResolvedValue({ user: { id: "1", role: "SELLER" } } as any);
      const request = new NextRequest("http://localhost/api/newsletter");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("returns the list for an ADMIN session", async () => {
      mockedGetServerSession.mockResolvedValue({ user: { id: "1", role: "ADMIN" } } as any);
      const request = new NextRequest("http://localhost/api/newsletter");
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("returns 403 without a token or admin session", async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const request = new NextRequest("http://localhost/api/newsletter?email=a@b.cl", {
        method: "DELETE",
      });
      const response = await DELETE(request);
      expect(response.status).toBe(403);
    });

    it("returns 200 with a valid token", async () => {
      mockedGetServerSession.mockResolvedValue(null);
      const email = "a@b.cl";
      const token = unsubscribeToken(email);
      const request = new NextRequest(
        `http://localhost/api/newsletter?email=${encodeURIComponent(email)}&token=${token}`,
        { method: "DELETE" }
      );
      const response = await DELETE(request);
      expect(response.status).toBe(200);
    });

    it("returns 200 for an ADMIN session without a token", async () => {
      mockedGetServerSession.mockResolvedValue({ user: { id: "1", role: "ADMIN" } } as any);
      const request = new NextRequest("http://localhost/api/newsletter?email=a@b.cl", {
        method: "DELETE",
      });
      const response = await DELETE(request);
      expect(response.status).toBe(200);
    });
  });
});
