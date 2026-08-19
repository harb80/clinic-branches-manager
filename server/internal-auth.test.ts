import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => ({
  countInternalUsers: vi.fn(),
  createInternalUser: vi.fn(),
  getUserByLogin: vi.fn(),
  createInternalSession: vi.fn(),
  setInternalSessionCookie: vi.fn(),
}));

vi.mock("./db", () => ({
  countInternalUsers: mocks.countInternalUsers,
  createInternalUser: mocks.createInternalUser,
  getUserByLogin: mocks.getUserByLogin,
  createMedicalAttachment: vi.fn(),
  createPatient: vi.fn(),
  getDashboardSummary: vi.fn(),
  getMedicalVisitForAttachment: vi.fn(),
  listBranches: vi.fn(),
  listInternalUsers: vi.fn(),
  searchPatients: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("./internalAuth", () => ({
  clearInternalSessionCookie: vi.fn(),
  createInternalSession: mocks.createInternalSession,
  setInternalSessionCookie: mocks.setInternalSessionCookie,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const account = { id: 1, openId: "internal-1", name: "Admin", email: "admin@example.com", username: "admin", passwordHash: "", loginMethod: "internal", role: "super_admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("internal authentication", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    account.passwordHash = await bcrypt.hash("correct-password", 4);
    mocks.createInternalSession.mockResolvedValue("session-token");
    mocks.createInternalUser.mockResolvedValue(account);
  });

  it("logs in with valid credentials and sets a session cookie", async () => {
    mocks.getUserByLogin.mockResolvedValue(account);
    const result = await appRouter.createCaller(context()).auth.login({ login: "admin", password: "correct-password" });
    expect(result.role).toBe("super_admin");
    expect(mocks.setInternalSessionCookie).toHaveBeenCalled();
  });

  it("rejects invalid credentials", async () => {
    mocks.getUserByLogin.mockResolvedValue(account);
    await expect(appRouter.createCaller(context()).auth.login({ login: "admin", password: "wrong-password" })).rejects.toThrow("Invalid login credentials");
  });

  it("creates the first super admin through setup", async () => {
    mocks.countInternalUsers.mockResolvedValue(0);
    const result = await appRouter.createCaller(context()).auth.setup({ name: "Admin", email: "admin@example.com", username: "admin", password: "correct-password" });
    expect(result.role).toBe("super_admin");
    expect(mocks.createInternalUser).toHaveBeenCalledWith(expect.objectContaining({ role: "super_admin", passwordHash: expect.any(String) }));
  });
});
