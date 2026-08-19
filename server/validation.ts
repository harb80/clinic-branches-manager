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
