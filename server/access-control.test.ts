import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("clinic access control", () => {
  it("blocks dashboard data for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.dashboard.summary()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks patient creation for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.patients.create({
      patientNumber: "PT-0001",
      fullName: "Test Patient",
      phone: "01000000000",
      gender: "female",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
