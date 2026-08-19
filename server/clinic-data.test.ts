import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMedicalAttachment: vi.fn(),
  createPatient: vi.fn(),
  updateInternalUser: vi.fn(),
  getMedicalVisitForAttachment: vi.fn(),
  hasInternalUserConflict: vi.fn(),
  searchPatients: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  createMedicalAttachment: mocks.createMedicalAttachment,
  createPatient: mocks.createPatient,
  updateInternalUser: mocks.updateInternalUser,
  getDashboardSummary: vi.fn(),
  getMedicalVisitForAttachment: mocks.getMedicalVisitForAttachment,
  hasInternalUserConflict: vi.fn().mockResolvedValue(false),
  listBranches: vi.fn(),
  searchPatients: mocks.searchPatients,
  writeAuditLog: mocks.writeAuditLog,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { attachmentBelongsToVisit, patientInput } from "./validation";

function createContext(role: "super_admin" | "receptionist" = "receptionist"): TrpcContext {
  return {
    user: {
      id: 11,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      username: "test-user",
      passwordHash: null,
      loginMethod: "internal",
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("clinic data operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPatient.mockResolvedValue({ id: 41, patientNumber: "PT-0041" });
    mocks.updateInternalUser.mockResolvedValue({ id: 8, name: "Updated User", email: "updated@example.com", username: "updated", role: "doctor", isActive: true });
    mocks.searchPatients.mockResolvedValue([{ id: 41, patientNumber: "PT-0041", fullName: "Patient One", phone: "01000000000" }]);
    mocks.getMedicalVisitForAttachment.mockResolvedValue({ id: 8, patientId: 10 });
    mocks.createMedicalAttachment.mockResolvedValue({ id: 91, visitId: 8, patientId: 10 });
  });

  it("accepts a valid patient record", () => {
    expect(patientInput.safeParse({ patientNumber: "PT-0001", fullName: "Patient One", phone: "01000000000", gender: "female" }).success).toBe(true);
  });

  it("rejects an attachment linked to another patient", () => {
    expect(attachmentBelongsToVisit({ visitId: 8, patientId: 9 }, { id: 8, patientId: 10 })).toBe(false);
    expect(attachmentBelongsToVisit({ visitId: 8, patientId: 10 }, { id: 8, patientId: 10 })).toBe(true);
  });

  it("returns searchable patient records", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.patients.search({ search: "01000000000" });
    expect(result).toHaveLength(1);
    expect(result[0]?.patientNumber).toBe("PT-0041");
    expect(mocks.searchPatients).toHaveBeenCalledWith("01000000000");
  });

  it("rejects an attachment when the visit belongs to another patient", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.medicalAttachments.create({ visitId: 8, patientId: 9, fileName: "result.pdf", mimeType: "application/pdf", storageKey: "visits/8/result.pdf", storageUrl: "https://storage.example/result.pdf" })).rejects.toThrow("Attachment must belong");
    expect(mocks.createMedicalAttachment).not.toHaveBeenCalled();
  });

  it("accepts a linked attachment and audits the upload", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.medicalAttachments.create({ visitId: 8, patientId: 10, fileName: "result.pdf", mimeType: "application/pdf", storageKey: "visits/8/result.pdf", storageUrl: "https://storage.example/result.pdf" });
    expect(result?.id).toBe(91);
    expect(mocks.createMedicalAttachment).toHaveBeenCalledWith(expect.objectContaining({ visitId: 8, patientId: 10, uploadedBy: 11 }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "upload", entityType: "medical_attachment", entityId: 91 }));
  });

  it("allows a super admin to update an internal user", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    const result = await caller.users.update({ id: 8, name: "Updated User", role: "doctor" });
    expect(result?.name).toBe("Updated User");
    expect(mocks.updateInternalUser).toHaveBeenCalledWith(8, { name: "Updated User", role: "doctor" });
  });

  it("blocks a receptionist from updating users", async () => {
    const caller = appRouter.createCaller(createContext("receptionist"));
    await expect(caller.users.update({ id: 8, name: "Not Allowed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("writes an audit record when a patient is created", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.patients.create({ patientNumber: "PT-0001", fullName: "Patient One", phone: "01000000000", gender: "female" });
    expect(result?.id).toBe(41);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ userId: 11, action: "create", entityType: "patient", entityId: 41 }));
  });
});
