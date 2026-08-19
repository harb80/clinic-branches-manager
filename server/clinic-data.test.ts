import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMedicalAttachment: vi.fn(),
  createMedicalVisit: vi.fn(),
  createInvoice: vi.fn(),
  recordPayment: vi.fn(),
  listInvoices: vi.fn(),
  getInvoiceReceipt: vi.fn(),
  setInvoiceStatus: vi.fn(),
  createPatient: vi.fn(),
  updateInternalUser: vi.fn(),
  getMedicalVisitForAttachment: vi.fn(),
  assertMedicalVisitScope: vi.fn(),
  hasInternalUserConflict: vi.fn(),
  searchPatients: vi.fn(),
  listPatientVisits: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  createMedicalAttachment: mocks.createMedicalAttachment,
  createMedicalVisit: mocks.createMedicalVisit,
  createInvoice: mocks.createInvoice,
  recordPayment: mocks.recordPayment,
  listInvoices: mocks.listInvoices,
  getInvoiceReceipt: mocks.getInvoiceReceipt,
  setInvoiceStatus: mocks.setInvoiceStatus,
  createPatient: mocks.createPatient,
  updateInternalUser: mocks.updateInternalUser,
  getDashboardSummary: vi.fn(),
  getMedicalVisitForAttachment: mocks.getMedicalVisitForAttachment,
  assertMedicalVisitScope: mocks.assertMedicalVisitScope,
  hasInternalUserConflict: mocks.hasInternalUserConflict,
  listBranches: vi.fn(),
  searchPatients: mocks.searchPatients,
  listPatientVisits: mocks.listPatientVisits,
  writeAuditLog: mocks.writeAuditLog,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { attachmentBelongsToVisit, calculatePaymentStatus, canAccessBranch, patientInput } from "./validation";

function createContext(role: "super_admin" | "receptionist" | "accountant" = "receptionist"): TrpcContext {
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
    mocks.createMedicalVisit.mockResolvedValue({ id: 77, appointmentId: 3, patientId: 10, doctorId: 7 });
    mocks.createInvoice.mockResolvedValue({ id: 31, invoiceNumber: "INV-31", patientId: 10, branchId: 1, total: "100" });
    mocks.recordPayment.mockResolvedValue({ id: 44, invoiceId: 31, patientId: 10, branchId: 1, amount: "50", method: "cash" });
    mocks.listInvoices.mockResolvedValue([]);
    mocks.getInvoiceReceipt.mockResolvedValue({ invoice: { id: 31, invoiceNumber: "INV-31", patientId: 10, branchId: 1, total: "100", status: "partial" }, payments: [{ id: 44, amount: "50", method: "cash", reference: "R-1", paidAt: new Date() }], paidAmount: "50.00", remainingAmount: "50.00" });
    mocks.setInvoiceStatus.mockImplementation(async ({ invoiceId, status }: { invoiceId: number; status: "cancelled" | "refunded" }) => ({ id: invoiceId, branchId: 1, status }));
    mocks.updateInternalUser.mockResolvedValue({ id: 8, name: "Updated User", email: "updated@example.com", username: "updated", role: "doctor", isActive: true });
    mocks.searchPatients.mockResolvedValue([{ id: 41, patientNumber: "PT-0041", fullName: "Patient One", phone: "01000000000" }]);
    mocks.listPatientVisits.mockResolvedValue([]);
    mocks.getMedicalVisitForAttachment.mockResolvedValue({ id: 8, patientId: 10 });
    mocks.assertMedicalVisitScope.mockResolvedValue(undefined);
    mocks.hasInternalUserConflict.mockResolvedValue(false);
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

  it("records invoice cancellation and refund audit events", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    await caller.billing.setStatus({ invoiceId: 31, status: "cancelled" });
    await caller.billing.setStatus({ invoiceId: 31, status: "refunded" });
    expect(mocks.setInvoiceStatus).toHaveBeenCalledWith(31, "cancelled");
    expect(mocks.setInvoiceStatus).toHaveBeenCalledWith(31, "refunded");
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "invoice", action: "refunded" }));
  });

  it("runs unpaid-to-partial-to-paid through billing procedures", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    let status: "unpaid" | "partial" | "paid" = "unpaid";
    mocks.createInvoice.mockResolvedValue({ id: 31, invoiceNumber: "INV-31", patientId: 10, branchId: 1, total: "100", status: "unpaid" });
    mocks.recordPayment.mockImplementation(async ({ amount }: { amount: string }) => {
      status = Number(amount) < 100 && status === "unpaid" ? "partial" : "paid";
      return { id: 44, invoiceId: 31, amount, status };
    });
    const invoice = await caller.billing.createInvoice({ invoiceNumber: "INV-31", patientId: 10, branchId: 1, subtotal: "100", discount: "0", total: "100" });
    expect(invoice?.status).toBe("unpaid");
    await caller.billing.recordPayment({ invoiceId: 31, patientId: 10, branchId: 1, amount: "40", method: "cash" });
    expect(status).toBe("partial");
    await caller.billing.recordPayment({ invoiceId: 31, patientId: 10, branchId: 1, amount: "60", method: "card" });
    expect(status).toBe("paid");
  });

  it("rejects overpayment through the billing procedure", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    mocks.recordPayment.mockRejectedValueOnce(new Error("Payment exceeds invoice balance"));
    await expect(caller.billing.recordPayment({ invoiceId: 31, patientId: 10, branchId: 1, amount: "101", method: "cash" })).rejects.toThrow("Payment exceeds invoice balance");
    expect(mocks.writeAuditLog).not.toHaveBeenCalledWith(expect.objectContaining({ entityType: "payment" }));
  });

  it("accepts each supported payment method through billing procedures", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    for (const method of ["cash", "card", "bank_transfer", "insurance", "other"] as const) {
      await caller.billing.recordPayment({ invoiceId: 31, patientId: 10, branchId: 1, amount: "10", method });
    }
    expect(mocks.recordPayment).toHaveBeenCalledTimes(5);
    expect(mocks.recordPayment).toHaveBeenLastCalledWith(expect.objectContaining({ method: "other" }));
  });

  it("returns an invoice receipt with saved payment details", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    const receipt = await caller.billing.receipt({ invoiceId: 31 });
    expect(receipt?.paidAmount).toBe("50.00");
    expect(receipt?.payments[0]?.method).toBe("cash");
  });

  it("calculates partial and paid payment states and rejects overpayment", () => {
    expect(calculatePaymentStatus(100, 0, 40)).toBe("partial");
    expect(calculatePaymentStatus(100, 40, 60)).toBe("paid");
    expect(() => calculatePaymentStatus(100, 80, 30)).toThrow("Payment exceeds invoice balance");
  });

  it("records invoice and payment audit events", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await caller.billing.createInvoice({ invoiceNumber: "INV-31", patientId: 10, branchId: 1, subtotal: "100", discount: "0", total: "100" });
    await caller.billing.recordPayment({ invoiceId: 31, patientId: 10, branchId: 1, amount: "50", method: "cash" });
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "invoice", branchId: 1 }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "payment", branchId: 1 }));
  });

  it("checks branch scope before creating a medical visit", async () => {
    const caller = appRouter.createCaller(createContext("super_admin"));
    await caller.medicalVisits.create({ appointmentId: 3, patientId: 10, doctorId: 7, diagnosis: "Follow-up" });
    expect(mocks.assertMedicalVisitScope).toHaveBeenCalledWith({ appointmentId: 3, patientId: 10, doctorId: 7, diagnosis: "Follow-up" }, { userId: 11, role: "super_admin" });
  });

  it("passes the requesting user scope into medical history access", async () => {
    const caller = appRouter.createCaller(createContext("receptionist"));
    await caller.medicalVisits.listByPatient({ patientId: 10 });
    expect(mocks.listPatientVisits).toHaveBeenCalledWith(10, { userId: 11, role: "receptionist" });
  });

  it("allows assigned branches and blocks cross-branch access", () => {
    expect(canAccessBranch("doctor", [1, 2], 2)).toBe(true);
    expect(canAccessBranch("doctor", [1, 2], 3)).toBe(false);
    expect(canAccessBranch("super_admin", [], 3)).toBe(true);
  });

  it("blocks an accountant from reading medical visit history", async () => {
    const caller = appRouter.createCaller(createContext("accountant"));
    await expect(caller.medicalVisits.listByPatient({ patientId: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects duplicate user creation and update", async () => {
    mocks.hasInternalUserConflict.mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext("super_admin"));
    await expect(caller.users.create({ name: "Duplicate", email: "used@example.com", username: "used", password: "password123", role: "doctor" })).rejects.toThrow("Username or email already exists");
    await expect(caller.users.update({ id: 8, username: "used" })).rejects.toThrow("Username or email already exists");
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
