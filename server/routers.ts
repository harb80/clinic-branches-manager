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
  listInternalUsers,
  createInternalUser,
  updateInternalUser,
  createMedicalAttachment,
  createPatient,
  getPatientByClientOperationId,
  getDashboardSummary,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  getDoctorAvailability,
  updateAppointmentStatus,
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
  listDoctorBranches,
  listSpecialties,
  createSpecialty,
  updateSpecialty,
  createDoctor,
  updateDoctor,
  createInvoice,
  getInvoiceReceipt,
  setInvoiceStatus,
  recordPayment,
  getUserByLogin,
  hasInternalUserConflict,
  listUserBranchIds,
  replaceUserBranches,
  updateInternalUserWithBranches,
  listBranches,
  listBranchWorkingHours,
  saveBranchWorkingHours,
  listDoctorSchedules,
  listDoctorSchedulesForManagement,
  saveDoctorSchedule,
  updateDoctorSchedule,
  listBranchServices,
  listBranchServicesForManagement,
  listServices,
  createService,
  updateService,
  saveBranchService,
  searchPatients,
  hasPatientConflict,
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
    branches: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listUserBranchIds(input.userId)),
    setBranches: adminProcedure.input(z.object({ userId: z.number().int().positive(), branchIds: z.array(z.number().int().positive()).max(20) })).mutation(async ({ ctx, input }) => { const branchIds = await replaceUserBranches(input.userId, input.branchIds); await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "user_branches", entityId: input.userId, metadata: { branchIds } }); return branchIds; }),
    list: adminProcedure.query(() => listInternalUsers()),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().email(), username: z.string().trim().min(3).max(120), password: z.string().min(8).max(120), role: z.enum(["branch_manager", "doctor", "receptionist", "accountant"]) })).mutation(async ({ ctx, input }) => {
      if (await hasInternalUserConflict({ email: input.email, username: input.username })) throw new Error("Username or email already exists");
      const passwordHash = await bcrypt.hash(input.password, 12);
      const account = await createInternalUser({ ...input, passwordHash });
      await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "user", entityId: account?.id, metadata: { role: input.role } });
      return account ? { id: account.id, name: account.name, email: account.email, username: account.username, role: account.role } : null;
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160).optional(), email: z.string().email().optional(), username: z.string().trim().min(3).max(120).optional(), role: z.enum(["super_admin", "branch_manager", "doctor", "receptionist", "accountant"]).optional(), isActive: z.boolean().optional(), branchIds: z.array(z.number().int().positive()).max(20).optional() })).mutation(async ({ ctx, input }) => {
      const { id, branchIds, ...changes } = input;
      if (await hasInternalUserConflict({ email: changes.email, username: changes.username }, id)) throw new Error("Username or email already exists");
      const account = branchIds ? await updateInternalUserWithBranches(id, { ...changes, branchIds }) : await updateInternalUser(id, changes);
      await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "user", entityId: id, metadata: { ...changes, ...(branchIds ? { branchIds } : {}) } });
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
    list: protectedProcedure.input(z.object({ date: z.string().optional(), from: z.string().optional(), to: z.string().optional(), branchId: z.number().int().positive().optional(), doctorId: z.number().int().positive().optional(), status: z.enum(["booked", "confirmed", "arrived", "completed", "cancelled", "no_show"]).optional() }).optional()).query(({ input }) => listAppointments(input)),
    byId: protectedProcedure.input(z.object({ appointmentId: z.number().int().positive() })).query(({ input }) => getAppointmentById(input.appointmentId)),
    availability: protectedProcedure.input(z.object({ doctorId: z.number().int().positive(), branchId: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ input }) => getDoctorAvailability(input)),
    create: protectedProcedure.input(z.object({ patientId: z.number().int().positive(), branchId: z.number().int().positive(), doctorId: z.number().int().positive(), serviceId: z.number().int().positive().optional(), clientOperationId: z.string().trim().min(8).max(100).optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), visitType: z.enum(["new", "follow_up", "emergency", "procedure"]), notes: z.string().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      const appointment = await createAppointment({ ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), createdBy: ctx.user.id });
      if (appointment) await writeAuditLog({ userId: ctx.user.id, branchId: appointment.branchId, action: "create", entityType: "appointment", entityId: appointment.id });
      return appointment;
    }),
    update: protectedProcedure.input(z.object({ appointmentId: z.number().int().positive(), branchId: z.number().int().positive(), doctorId: z.number().int().positive(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), visitType: z.enum(["new", "follow_up", "emergency", "procedure"]), notes: z.string().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      const appointment = await updateAppointment({ ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) });
      if (appointment) await writeAuditLog({ userId: ctx.user.id, branchId: appointment.branchId, action: "update", entityType: "appointment", entityId: appointment.id });
      return appointment;
    }),
    updateStatus: protectedProcedure.input(z.object({ appointmentId: z.number().int().positive(), status: z.enum(["booked", "confirmed", "arrived", "completed", "cancelled", "no_show"]) })).mutation(async ({ ctx, input }) => {
      const appointment = await updateAppointmentStatus({ ...input, changedBy: ctx.user.id });
      if (appointment) await writeAuditLog({ userId: ctx.user.id, branchId: appointment.branchId, action: "update_status", entityType: "appointment", entityId: appointment.id, metadata: { status: appointment.status } });
      return appointment;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardSummary()),
  }),
  branches: router({
    hours: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").input(z.object({ branchId: z.number().int().positive() })).query(({ input }) => listBranchWorkingHours(input.branchId)),
    saveHours: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ branchId: z.number().int().positive(), dayOfWeek: z.number().int().min(0).max(6), opensAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), closesAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), isClosed: z.boolean() })).mutation(async ({ ctx, input }) => { const hours = await saveBranchWorkingHours(input); if (hours) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "update", entityType: "branch_working_hours", entityId: hours.id }); return hours; }),
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
    create: protectedProcedure.input(patientInput.extend({ clientOperationId: z.string().trim().min(8).max(100).optional() })).mutation(async ({ ctx, input }) => {
      if (input.clientOperationId) {
        const existing = await getPatientByClientOperationId(input.clientOperationId);
        if (existing) return existing;
      }
      if (await hasPatientConflict({ patientNumber: input.patientNumber, phone: input.phone })) throw new Error("Patient number or phone already exists");
      const patient = await createPatient(input);
      if (patient && patient.clientOperationId === input.clientOperationId) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "patient", entityId: patient.id, metadata: { patientNumber: patient.patientNumber } });
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
    create: roleProcedure("admin", "super_admin", "branch_manager", "doctor").input(z.object({ appointmentId: z.number().int().positive(), patientId: z.number().int().positive(), doctorId: z.number().int().positive(), clientOperationId: z.string().trim().min(8).max(100).optional(), chiefComplaint: z.string().max(10000).optional(), diagnosis: z.string().max(10000).optional(), medications: z.string().max(10000).optional(), followUpPlan: z.string().max(10000).optional(), visitNotes: z.string().max(10000).optional() })).mutation(async ({ ctx, input }) => {
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
    branches: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ doctorId: z.number().int().positive() })).query(({ input }) => listDoctorBranches(input.doctorId)),
    specialties: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").query(() => listSpecialties()),
    createSpecialty: roleProcedure("admin", "super_admin").input(z.object({ nameAr: z.string().trim().min(2).max(160), nameEn: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => { const specialty = await createSpecialty(input); if (specialty) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "specialty", entityId: specialty.id }); return specialty; }),
    updateSpecialty: roleProcedure("admin", "super_admin").input(z.object({ id: z.number().int().positive(), nameAr: z.string().trim().min(2).max(160).optional(), nameEn: z.string().trim().min(2).max(160).optional(), isActive: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const specialty = await updateSpecialty(input); if (specialty) await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "specialty", entityId: specialty.id }); return specialty; }),
    schedules: roleProcedure("admin", "super_admin", "branch_manager", "doctor", "receptionist").input(z.object({ doctorId: z.number().int().positive() })).query(({ input }) => listDoctorSchedules(input.doctorId)),
    schedulesForManagement: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ doctorId: z.number().int().positive() })).query(({ input }) => listDoctorSchedulesForManagement(input.doctorId)),
    saveSchedule: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ doctorId: z.number().int().positive(), branchId: z.number().int().positive(), dayOfWeek: z.number().int().min(0).max(6), startsAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), endsAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), slotMinutes: z.number().int().min(5).max(240) })).mutation(async ({ ctx, input }) => { const schedule = await saveDoctorSchedule(input); if (schedule) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "create", entityType: "doctor_schedule", entityId: schedule.id, metadata: { doctorId: input.doctorId } }); return schedule; }),
    updateSchedule: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ id: z.number().int().positive(), doctorId: z.number().int().positive(), branchId: z.number().int().positive(), dayOfWeek: z.number().int().min(0).max(6), startsAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), endsAt: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), slotMinutes: z.number().int().min(5).max(240), isActive: z.boolean() })).mutation(async ({ ctx, input }) => { const schedule = await updateDoctorSchedule(input); if (schedule) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "update", entityType: "doctor_schedule", entityId: schedule.id, metadata: { doctorId: input.doctorId, isActive: input.isActive } }); return schedule; }),
    create: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ specialtyId: z.number().int().positive(), userId: z.number().int().positive().optional(), licenseNumber: z.string().max(80).optional(), phone: z.string().max(40).optional(), consultationFee: z.string(), branchIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ ctx, input }) => {
      const doctor = await createDoctor(input);
      if (doctor?.doctor) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "doctor", entityId: doctor.doctor.id, metadata: { branchIds: input.branchIds, specialtyId: input.specialtyId } });
      return doctor;
    }),
    update: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ id: z.number().int().positive(), specialtyId: z.number().int().positive(), userId: z.number().int().positive().optional(), licenseNumber: z.string().max(80).optional(), phone: z.string().max(40).optional(), consultationFee: z.string(), branchIds: z.array(z.number().int().positive()).min(1) })).mutation(async ({ ctx, input }) => {
      const doctor = await updateDoctor(input);
      if (doctor?.doctor) await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "doctor", entityId: doctor.doctor.id, metadata: { branchIds: input.branchIds, specialtyId: input.specialtyId } });
      return doctor;
    }),
  }),
  services: router({
    list: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").query(() => listServices()),
    listByBranch: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").input(z.object({ branchId: z.number().int().positive() })).query(({ input }) => listBranchServices(input.branchId)),
    listByBranchForManagement: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ branchId: z.number().int().positive() })).query(({ input }) => listBranchServicesForManagement(input.branchId)),
    create: adminProcedure.input(z.object({ nameAr: z.string().trim().min(2).max(180), nameEn: z.string().trim().min(2).max(180), specialtyId: z.number().int().positive().optional(), defaultPrice: z.string() })).mutation(async ({ ctx, input }) => { const service = await createService(input); if (service) await writeAuditLog({ userId: ctx.user.id, action: "create", entityType: "service", entityId: service.id }); return service; }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), nameAr: z.string().trim().min(2).max(180).optional(), nameEn: z.string().trim().min(2).max(180).optional(), specialtyId: z.number().int().positive().nullable().optional(), defaultPrice: z.string().optional(), isActive: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const service = await updateService(input); if (service) await writeAuditLog({ userId: ctx.user.id, action: "update", entityType: "service", entityId: service.id }); return service; }),
    saveBranchPrice: roleProcedure("admin", "super_admin", "branch_manager").input(z.object({ branchId: z.number().int().positive(), serviceId: z.number().int().positive(), price: z.string(), isActive: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { const service = await saveBranchService(input); await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "update", entityType: "branch_service", entityId: service?.id, metadata: { serviceId: input.serviceId, price: input.price, isActive: input.isActive } }); return service; }),
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
    createInvoice: roleProcedure("admin", "super_admin", "branch_manager", "accountant").input(z.object({ invoiceNumber: z.string().trim().min(3).max(50), patientId: z.number().int().positive(), appointmentId: z.number().int().positive().optional(), branchId: z.number().int().positive(), subtotal: z.string(), discount: z.string(), total: z.string(), items: z.array(z.object({ serviceId: z.number().int().positive(), quantity: z.number().int().min(1).max(100) })).max(50).optional() })).mutation(async ({ ctx, input }) => {
      const invoice = await createInvoice({ ...input, createdBy: ctx.user.id });
      if (invoice) await writeAuditLog({ userId: ctx.user.id, branchId: input.branchId, action: "create", entityType: "invoice", entityId: invoice.id, metadata: { patientId: input.patientId, total: invoice.total, itemCount: input.items?.length ?? 0 } });
      return invoice;
    }),
    recordPayment: roleProcedure("admin", "super_admin", "branch_manager", "receptionist", "accountant").input(z.object({ invoiceId: z.number().int().positive(), patientId: z.number().int().positive(), branchId: z.number().int().positive(), amount: z.string(), method: z.enum(["cash", "card", "bank_transfer", "insurance", "other"]), reference: z.string().max(120).optional(), clientOperationId: z.string().trim().min(8).max(100).optional() })).mutation(async ({ ctx, input }) => {
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
