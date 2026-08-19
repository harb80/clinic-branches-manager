import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { clearInternalSessionCookie, createInternalSession, setInternalSessionCookie } from "./internalAuth";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, roleProcedure, router } from "./_core/trpc";
import {
  countInternalUsers,
  createInternalUser,
  updateInternalUser,
  createMedicalAttachment,
  createPatient,
  getDashboardSummary,
  createAppointment,
  listAppointments,
  createBranch,
  updateBranch,
  getMedicalVisitForAttachment,
  createMedicalVisit,
  assertMedicalVisitScope,
  listPatientVisits,
  listMedicalAttachments,
  listInvoices,
  getReportsSummary,
  listDoctors,
  listSpecialties,
  createDoctor,
  createInvoice,
  getInvoiceReceipt,
  setInvoiceStatus,
  recordPayment,
  getUserByLogin,
  hasInternalUserConflict,
  listBranches,
  listInternalUsers,
  searchPatients,
  writeAuditLog,
} from "./db";
import { attachmentBelongsToVisit, medicalAttachmentInput, patientInput } from "./validation";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || !["super_admin", "admin"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    bootstrapStatus: publicProcedure.query(() => countInternalUsers().then(count => ({ needsSetup: count === 0 }))),
    setup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().email(), username: z.string().trim().min(3).max(120), password: z.string().min(8).max(120) })).mutation(async ({ ctx, input }) => {
      if (await countInternalUsers() > 0) throw new Error("Initial setup is already complete");
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await createInternalUser({ ...input, passwordHash, role: "super_admin" });
      if (!account) throw new Error("Could not create account");
      const token = await createInternalSession(account);
      setInternalSessionCookie(ctx.res, ctx.req, token);
      return { id: account.id, name: account.name, role: account.role };
    }),
    login: publicProcedure.input(z.object({ login: z.string().trim().min(3), password: z.string().min(6) })).mutation(async ({ ctx, input }) => {
      const account = await getUserByLogin(input.login);
      if (!account?.passwordHash || !account.isActive || !(await bcrypt.compare(input.password, account.passwordHash))) throw new Error("Invalid login credentials");
      const token = await createInternalSession(account);
      setInternalSessionCookie(ctx.res, ctx.req, token);
      return { id: account.id, name: account.name, email: account.email, role: account.role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearInternalSessionCookie(ctx.res, ctx.req);
      return { success: true } as const;
    }),
  }),
  users: router({
    list: adminProcedure.query(() => listInternalUsers()),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().email(), username: z.string().trim().min(3).max(120), password: z.string().min(8).max(120), role: z.enum(["branch_manager", "doctor", "receptionist", "accountant"]) })).mutation(async ({ ctx, input }) => {
      if (await hasInternalUserConflict({ email: input.email, username: input.username })) throw new Error("Username or email already exists");
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await createInternalUser({ ...input, passwordHash });
      await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "user", entityId: account?.id, metadata: { role: input.role } });
      return account ? { id: account.id, name: account.name, email: account.email, username: account.username, role: account.role } : null;
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), email: z.string().email().optional(), username: z.string().trim().min(3).max(120).optional(), role: z.enum(["super_admin", "branch_manager", "doctor", "receptionist", "accountant"]).optional(), isActive: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      if (await hasInternalUserConflict({ email: changes.email, username: changes.username }, id)) throw new Error("Username or email already exists");
      const account = await updateInternalUser(id, changes);
      await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "user", entityId: id, metadata: changes });
      return account;
    }),
    resetPassword: adminProcedure.input(z.object({ id: z.number().int().positive(), password: z.string().min(8).max(120) })).mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await updateInternalUser(input.id, { passwordHash });
      await writeAuditLog({ userId: ctx.user.id, action: "reset_password", entityType: "user", entityId: input.id });
      return account;
    }),
  }),
  appointments: router({
    list: protectedProcedure.input(z.object({ date: z.string().optional() }).optional()).query(({ input }) => listAppointments(input?.date)),
    create: protectedProcedure.input(z.object({ patientId: z.number().int().positive(), branchId: z.number().int().positive(), doctorId: z.number().int().positive(), serviceId: z.number().int().positive().optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), visitType: z.enum(["new", "follow_up", "emergency", "procedure"]), notes: z.string().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      const appointment = await createAppointment({ ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), createdBy: ctx.user.id });
      if (appointment) await writeAuditLog({ userId: ctx.user.id, branchId: appointment.branchId, action: "create", entityType: "appointment", entityId: appointment.id });
      return appointment;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardSummary()),
  }),
  branches: router({
    list: protectedProcedure.query(() => listBranches()),
    create: adminProcedure.input(z.object({ nameAr: z.string().trim().min(2).max(180), nameEn: z.string().trim().min(2).max(180), code: z.string().trim().min(2).max(32), address: z.string().max(1000).optional(), phone: z.string().max(40).optional() })).mutation(async ({ ctx, input }) => {
      const branch = await createBranch(input);
      if (branch) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "branch", entityId: branch.id });
      return branch;
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), nameAr: z.string().trim().min(2).max(180).optional(), nameEn: z.string().trim().min(2).max(180).optional(), code: z.string().trim().min(2).max(32).optional(), address: z.string().max(1000).optional(), phone: z.string().max(40).optional(), isActive: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      const branch = await updateBranch(id, changes);
      await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "branch", entityId: id, metadata: changes });
      return branch;
    }),
  }),
  patients: router({
    search: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => searchPatients(input?.search)),
    create: protectedProcedure.input(patientInput).mutation(async ({ ctx, input }) => {
      const patient = await createPatient(input);
      if (patient) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "patient", entityId: patient.id, metadata: { patientNumber: patient.patientNumber } });
      return patient;
    }),
  }),
  medicalVisits: router({
    listByPatient: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").input(z.object({ patientId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try {
        return await listPatientVisits(input.patientId, { userId: ctx.user.id, role: ctx.user.role });
      } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_BRANCH_SCOPE") throw new TRPCError({ code: "FORBIDDEN", message: "Medical history is outside your assigned branch scope" });
        throw error;
      }
    }),
    create: roleProcedure("admin", "super_admin", "branch_manager", "doctor").input(z.object({ appointmentId: z.number().int().positive(), patientId: z.number().int().positive(), doctorId: z.number().int().positive(), chiefComplaint: z.string().max(10000).optional(), diagnosis: z.string().max(10000).optional(), medications: z.string().max(10000).optional(), followUpPlan: z.string().max(10000).optional(), visitNotes: z.string().max(10000).optional() })).mutation(async ({ ctx, input }) => {
      try {
        await assertMedicalVisitScope(input, { userId: ctx.user.id, role: ctx.user.role });
        const visit = await createMedicalVisit(input);
        if (visit) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "medical_visit", entityId: visit.id, metadata: { patientId: input.patientId, appointmentId: input.appointmentId } });
        return visit;
      } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN_BRANCH_SCOPE") throw new TRPCError({ code: "FORBIDDEN", message: "Medical visit is outside your assigned branch scope" });
        throw error;
      }
    }),
  }),
  doctors: router({
    list: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").query(() => listDoctors()),
    specialties: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").query(() => listSpecialties()),
    create: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ specialtyId: z.number().int().positive(), userId: z.number().int().positive().optional(), licenseNumber: z.string().max(80).optional(), phone: z.string().max(40).optional(), consultationFee: z.string(), branchIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ ctx, input }) => {
      const doctor = await createDoctor(input);
      if (doctor?.doctor) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "doctor", entityId: doctor.doctor.id, metadata: { branchIds: input.branchIds, specialtyId: input.specialtyId } });
      return doctor;
    }),
  }),
  reports: router({
    summary: roleProcedure("admin", "super_admin", "branch_manager", "accountant", "receptionist", "doctor").input(z.object({ branchId: z.number().int().positive().optional(), from: z.string().optional(), to: z.string().optional() })).query(({ input }) => getReportsSummary({ branchId: input.branchId, from: input.from ? new Date(input.from) : undefined, to: input.to ? new Date(input.to) : undefined })),
  }),
  billing: router({
    invoices: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").input(z.object({ patientId: z.number().int().positive().optional() })).query(({ input }) => listInvoices(input.patientId)),
    receipt: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").input(z.object({ invoiceId: z.number().int().positive() })).query(({ input }) => getInvoiceReceipt(input.invoiceId)),
    setStatus: roleProcedure("admin", "super_admin", "branch_manager", "accountant").input(z.object({ invoiceId: z.number().int().positive(), status: z.enum(["cancelled", "refunded"]) })).mutation(async ({ ctx, input }) => {
      const invoice = await setInvoiceStatus(input.invoiceId, input.status);
      if (invoice) await writeAuditLog({ userId: ctx.user.id, branchId: invoice.branchId, action: input.status, entityType: "invoice", entityId: invoice.id });
      return invoice;
    }),
    createInvoice: roleProcedure("admin", "super_admin", "branch_manager", "accountant").input(z.object({ invoiceNumber: z.string().trim().min(3).max(50), patientId: z.number().int().positive(), appointmentId: z.number().int().positive().optional(), branchId: z.number().int().positive(), subtotal: z.string(), discount: z.string(), total: z.string() })).mutation(async ({ ctx, input }) => {
      const invoice = await createInvoice({ ...input, createdBy: ctx.user.id });
      if (invoice) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "create", entityType: "invoice", entityId: invoice.id, metadata: { patientId: input.patientId, total: input.total } });
      return invoice;
    }),
    recordPayment: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").input(z.object({ invoiceId: z.number().int().positive(), patientId: z.number().int().positive(), branchId: z.number().int().positive(), amount: z.string(), method: z.enum(["cash", "card", "bank_transfer", "insurance", "other"]), reference: z.string().max(120).optional() })).mutation(async ({ ctx, input }) => {
      const payment = await recordPayment({ ...input, receivedBy: ctx.user.id });
      if (payment) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "create", entityType: "payment", entityId: payment.id, metadata: { invoiceId: input.invoiceId, amount: input.amount, method: input.method } });
      return payment;
    }),
  }),
  medicalAttachments: router({
    listByVisit: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").input(z.object({ visitId: z.number().int().positive(), patientId: z.number().int().positive() })).query(({ input }) => listMedicalAttachments(input.visitId, input.patientId)),
    upload: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").input(z.object({ visitId: z.number().int().positive(), patientId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().min(1), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024) })).mutation(async ({ ctx, input }) => {
      const visit = await getMedicalVisitForAttachment(input.visitId);
      if (!attachmentBelongsToVisit(input, visit)) throw new Error("Attachment must belong to the selected visit and patient");
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.length > 10 * 1024 * 1024) throw new Error("Attachment is too large");
      const stored = await storagePut(`medical-visits/${input.visitId}/${input.fileName}`, buffer, input.mimeType);
      const attachment = await createMedicalAttachment({ visitId: input.visitId, patientId: input.patientId, fileName: input.fileName, mimeType: input.mimeType, storageKey: stored.key, storageUrl: stored.url, sizeBytes: buffer.length, uploadedBy: ctx.user.id });
      if (attachment) await writeAuditLog({ userId: ctx.user.id, action: "upload", entityType: "medical_attachment", entityId: attachment.id, metadata: { visitId: input.visitId, patientId: input.patientId, fileName: input.fileName } });
      return attachment;
    }),
    create: protectedProcedure.input(medicalAttachmentInput).mutation(async ({ ctx, input }) => {
      const visit = await getMedicalVisitForAttachment(input.visitId);
      if (!attachmentBelongsToVisit(input, visit)) throw new Error("Attachment must belong to the selected visit and patient");
      const attachment = await createMedicalAttachment({ ...input, uploadedBy: ctx.user.id });
      if (attachment) await writeAuditLog({ userId: ctx.user.id, action: "upload", entityType: "medical_attachment", entityId: attachment.id, metadata: { visitId: input.visitId, patientId: input.patientId } });
      return attachment;
    }),
  }),
});

export type AppRouter = typeof appRouter;
