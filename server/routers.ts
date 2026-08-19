import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createMedicalAttachment, createPatient, getDashboardSummary, getMedicalVisitForAttachment, listBranches, searchPatients, writeAuditLog } from "./db";
import { attachmentBelongsToVisit, medicalAttachmentInput, patientInput } from "./validation";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardSummary()),
  }),
  branches: router({
    list: protectedProcedure.query(() => listBranches()),
  }),
  patients: router({
    search: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ input }) => searchPatients(input?.search)),
    create: protectedProcedure.input(patientInput).mutation(async ({ ctx, input }) => {
      const patient = await createPatient(input);
      if (patient) {
        await writeAuditLog({
          userId: ctx.user.id,
          action: "create",
          entityType: "patient",
          entityId: patient.id,
          metadata: { patientNumber: patient.patientNumber },
        });
      }
      return patient;
    }),
  }),
  medicalAttachments: router({
    create: protectedProcedure.input(medicalAttachmentInput).mutation(async ({ ctx, input }) => {
      const visit = await getMedicalVisitForAttachment(input.visitId);
      if (!attachmentBelongsToVisit(input, visit)) {
        throw new Error("Attachment must belong to the selected visit and patient");
      }
      const attachment = await createMedicalAttachment({ ...input, uploadedBy: ctx.user.id });
      if (attachment) {
        await writeAuditLog({ userId: ctx.user.id, action: "upload", entityType: "medical_attachment", entityId: attachment.id, metadata: { visitId: input.visitId, patientId: input.patientId } });
      }
      return attachment;
    }),
  }),
});

export type AppRouter = typeof appRouter;
