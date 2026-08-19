import { z } from "zod";

export const patientInput = z.object({
  patientNumber: z.string().trim().min(2).max(40),
  fullName: z.string().trim().min(2).max(220),
  phone: z.string().trim().min(5).max(40),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["female", "male", "other"]),
  allergies: z.string().max(5000).optional(),
  chronicConditions: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const medicalAttachmentInput = z.object({
  visitId: z.number().int().positive(),
  patientId: z.number().int().positive(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  storageKey: z.string().trim().min(1).max(500),
  storageUrl: z.string().url().max(1000),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export function attachmentBelongsToVisit(input: { visitId: number; patientId: number }, visit: { id: number; patientId: number } | undefined) {
  return Boolean(visit && visit.id === input.visitId && visit.patientId === input.patientId);
}

export function canAccessBranch(role: string, assignedBranchIds: number[], targetBranchId: number) {
  if (role === "admin" || role === "super_admin") return true;
  return assignedBranchIds.includes(targetBranchId);
}

export function calculateInvoiceTotals(items: Array<{ unitPrice: string | number; quantity: number }>, discount: string | number) {
  const subtotal = items.reduce((sum, item) => {
    if (!Number.isFinite(Number(item.unitPrice)) || item.quantity <= 0) throw new Error("Invoice item values are invalid");
    return sum + Number(item.unitPrice) * item.quantity;
  }, 0);
  const total = subtotal - Number(discount);
  if (!Number.isFinite(total) || Number(discount) < 0 || total < 0) throw new Error("Invoice total cannot be negative");
  return { subtotal: subtotal.toFixed(2), total: total.toFixed(2) };
}

export function calculatePaymentStatus(invoiceTotal: number, alreadyPaid: number, newPayment: number) {
  if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0 || !Number.isFinite(newPayment) || newPayment <= 0 || alreadyPaid + newPayment > invoiceTotal) throw new Error("Payment exceeds invoice balance");
  return alreadyPaid + newPayment >= invoiceTotal ? "paid" as const : "partial" as const;
}
