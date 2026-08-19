import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("required specialties database integration", () => {
  it("returns both required specialties from the real database when configured", async () => {
    if (!process.env.DATABASE_URL) return;
    const now = new Date();
    const ctx: TrpcContext = {
      user: { id: 1, openId: "integration-admin", name: "Integration Admin", email: "integration@example.com", username: "integration-admin", passwordHash: null, loginMethod: "internal", role: "admin", isActive: true, createdAt: now, updatedAt: now, lastSignedIn: now },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).doctors.specialties();
    const names = result.map(item => item.nameEn);
    expect(names).toEqual(expect.arrayContaining(["Obstetrics & Gynecology", "Male Reproductive Medicine"]));
  });
});
