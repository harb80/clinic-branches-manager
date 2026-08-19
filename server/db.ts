import { and, asc, count, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sum } from "drizzle-orm";
import {
  appointments,
  branches,
  branchWorkingHours,
  doctorSchedules,
  medicalAttachments,
  medicalVisits,
  invoices,
  payments,
  doctors,
  doctorBranches,
  specialties,
  InsertUser,
  patients,
  users,
  auditLogs,
  userBranches,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculatePaymentStatus } from "./validation";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByLogin(login: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(or(eq(users.username, login), eq(users.email, login))).limit(1);
  return result[0];
}

export async function countInternalUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ value: count() }).from(users).where(sql`${users.passwordHash} IS NOT NULL`);
  return Number(result[0]?.value ?? 0);
}

export async function hasInternalUserConflict(input: { email?: string; username?: string }, excludeId?: number) {
  const db = await getDb();
  if (!db) return false;
  const conditions = [input.email ? eq(users.email, input.email) : undefined, input.username ? eq(users.username, input.username) : undefined].filter(Boolean) as Array<ReturnType<typeof eq>>;
  if (conditions.length === 0) return false;
  const where = excludeId ? and(or(...conditions), ne(users.id, excludeId)) : or(...conditions);
  const result = await db.select({ id: users.id }).from(users).where(where).limit(1);
  return result.length > 0;
}

export async function listInternalUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, isActive: users.isActive }).from(users).where(sql`${users.passwordHash} IS NOT NULL`).orderBy(asc(users.name));
}

export async function updateInternalUser(id: number, input: { name?: string; email?: string; username?: string; role?: "super_admin" | "branch_manager" | "doctor" | "receptionist" | "accountant"; isActive?: boolean; passwordHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(input).where(eq(users.id, id));
  const result = await db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createInternalUser(input: { name: string; email: string; username: string; passwordHash: string; role: "super_admin" | "branch_manager" | "doctor" | "receptionist" | "accountant" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const openId = `internal-${randomUUID()}`;
  const result = await db.insert(users).values({ openId, name: input.name, email: input.email, username: input.username, passwordHash: input.passwordHash, role: input.role, loginMethod: "internal", isActive: true });
  const userId = Number(result[0].insertId);
  const created = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return created[0];
}

export async function listBranchWorkingHours(branchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branchWorkingHours).where(eq(branchWorkingHours.branchId, branchId)).orderBy(asc(branchWorkingHours.dayOfWeek));
}

export async function saveBranchWorkingHours(input: { branchId: number; dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(branchWorkingHours).values(input).onDuplicateKeyUpdate({ set: { opensAt: input.opensAt, closesAt: input.closesAt, isClosed: input.isClosed } });
  const rows = await db.select().from(branchWorkingHours).where(and(eq(branchWorkingHours.branchId, input.branchId), eq(branchWorkingHours.dayOfWeek, input.dayOfWeek))).limit(1);
  return rows[0];
}

export async function listDoctorSchedules(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId, doctorId), eq(doctorSchedules.isActive, true))).orderBy(asc(doctorSchedules.dayOfWeek));
}

export async function saveDoctorSchedule(input: { doctorId: number; branchId: number; dayOfWeek: number; startsAt: string; endsAt: string; slotMinutes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(doctorSchedules).values({ ...input, isActive: true });
  const rows = await db.select().from(doctorSchedules).where(eq(doctorSchedules.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function listBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(asc(branches.nameAr));
}

export async function listDoctors() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ doctor: doctors, specialty: specialties }).from(doctors).leftJoin(specialties, eq(doctors.specialtyId, specialties.id)).orderBy(asc(doctors.id));
}

export async function createDoctor(input: { specialtyId: number; userId?: number; licenseNumber?: string; phone?: string; consultationFee: string; branchIds: number[] }) {
  await ensureRequiredSpecialties();
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(doctors).values({ specialtyId: input.specialtyId, userId: input.userId, licenseNumber: input.licenseNumber, phone: input.phone, consultationFee: input.consultationFee });
  const doctorId = Number(result[0].insertId);
  if (input.branchIds.length > 0) await db.insert(doctorBranches).values(input.branchIds.map(branchId => ({ doctorId, branchId })));
  const rows = await db.select({ doctor: doctors, specialty: specialties }).from(doctors).leftJoin(specialties, eq(doctors.specialtyId, specialties.id)).where(eq(doctors.id, doctorId)).limit(1);
  return rows[0];
}

export async function createSpecialty(input: { nameAr: string; nameEn: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(specialties).values({ ...input, isActive: true });
  const rows = await db.select().from(specialties).where(eq(specialties.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updateSpecialty(input: { id: number; nameAr?: string; nameEn?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { id, ...changes } = input;
  await db.update(specialties).set(changes).where(eq(specialties.id, id));
  const rows = await db.select().from(specialties).where(eq(specialties.id, id)).limit(1);
  return rows[0];
}

export async function ensureRequiredSpecialties() {
  const db = await getDb();
  if (!db) return;
  const required = [
    { nameAr: "نساء وتوليد", nameEn: "Obstetrics & Gynecology" },
    { nameAr: "أمراض ذكورة", nameEn: "Male Reproductive Medicine" },
  ];
  const current = await db.select().from(specialties);
  for (const specialty of required) {
    if (!current.some(item => item.nameEn === specialty.nameEn)) await db.insert(specialties).values({ ...specialty, isActive: true });
  }
}

export async function listSpecialties() {
  const db = await getDb();
  if (!db) return [];
  await ensureRequiredSpecialties();
  return db.select().from(specialties).where(eq(specialties.isActive, true)).orderBy(asc(specialties.nameAr));
}

export async function getReportsSummary(filters: { branchId?: number; from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return { bookings: 0, completed: 0, cancelled: 0, noShow: 0, collections: "0.00", newPatients: 0 };
  const appointmentConditions = [];
  if (filters.branchId) appointmentConditions.push(eq(appointments.branchId, filters.branchId));
  if (filters.from) appointmentConditions.push(sql`${appointments.startsAt} >= ${filters.from}`);
  if (filters.to) appointmentConditions.push(sql`${appointments.startsAt} <= ${filters.to}`);
  const appointmentRows = await db.select({ status: appointments.status }).from(appointments).where(appointmentConditions.length ? and(...appointmentConditions) : undefined);
  const paymentConditions = [];
  if (filters.branchId) paymentConditions.push(eq(payments.branchId, filters.branchId));
  if (filters.from) paymentConditions.push(sql`${payments.paidAt} >= ${filters.from}`);
  if (filters.to) paymentConditions.push(sql`${payments.paidAt} <= ${filters.to}`);
  const paymentRows = await db.select({ amount: payments.amount }).from(payments).where(paymentConditions.length ? and(...paymentConditions) : undefined);
  const patientConditions = [];
  if (filters.from) patientConditions.push(sql`${patients.createdAt} >= ${filters.from}`);
  if (filters.to) patientConditions.push(sql`${patients.createdAt} <= ${filters.to}`);
  const patientRows = await db.select({ id: patients.id }).from(patients).where(patientConditions.length ? and(...patientConditions) : undefined);
  return { bookings: appointmentRows.length, completed: appointmentRows.filter(row => row.status === "completed").length, cancelled: appointmentRows.filter(row => row.status === "cancelled").length, noShow: appointmentRows.filter(row => row.status === "no_show").length, collections: paymentRows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2), newPatients: patientRows.length };
}

export async function listInvoices(patientId?: number) {
  const db = await getDb();
  if (!db) return [];
  return patientId ? db.select().from(invoices).where(eq(invoices.patientId, patientId)).orderBy(sql`${invoices.createdAt} DESC`) : db.select().from(invoices).orderBy(sql`${invoices.createdAt} DESC`);
}

export async function createInvoice(input: { invoiceNumber: string; patientId: number; appointmentId?: number; branchId: number; subtotal: string; discount: string; total: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(invoices).values(input);
  const rows = await db.select().from(invoices).where(eq(invoices.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function setInvoiceStatus(invoiceId: number, status: "cancelled" | "refunded") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!current[0]) throw new Error("Invoice not found");
  if (status === "refunded" && current[0].status !== "paid") throw new Error("Only paid invoices can be refunded");
  await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId));
  const rows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  return rows[0];
}

export async function getInvoiceReceipt(invoiceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const invoiceRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const invoice = invoiceRows[0];
  if (!invoice) return undefined;
  const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(sql`${payments.paidAt} DESC`);
  const paidAmount = paymentRows.reduce((total, payment) => total + Number(payment.amount), 0);
  return { invoice, payments: paymentRows, paidAmount: paidAmount.toFixed(2), remainingAmount: Math.max(0, Number(invoice.total) - paidAmount).toFixed(2) };
}

export async function recordPayment(input: { invoiceId: number; patientId: number; branchId: number; amount: string; method: "cash" | "card" | "bank_transfer" | "insurance" | "other"; reference?: string; receivedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const invoiceRows = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
  const invoice = invoiceRows[0];
  if (!invoice || invoice.patientId !== input.patientId || invoice.branchId !== input.branchId) throw new Error("Invoice scope mismatch");
  const existing = await db.select({ amount: payments.amount }).from(payments).where(eq(payments.invoiceId, input.invoiceId));
  const paid = existing.reduce((total, item) => total + Number(item.amount), 0);
  const amount = Number(input.amount);
  const total = Number(invoice.total);
  const status = calculatePaymentStatus(total, paid, amount);
  const result = await db.insert(payments).values(input);
  await db.update(invoices).set({ status }).where(eq(invoices.id, input.invoiceId));
  const rows = await db.select().from(payments).where(eq(payments.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function createBranch(input: { nameAr: string; nameEn: string; code: string; address?: string; phone?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(branches).values(input);
  const branchId = Number(result[0].insertId);
  const created = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return created[0];
}

export async function updateBranch(id: number, input: { nameAr?: string; nameEn?: string; code?: string; address?: string; phone?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(branches).set(input).where(eq(branches.id, id));
  const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return result[0];
}

export async function listAppointments(date?: string) {
  const db = await getDb();
  if (!db) return [];
  const day = date ?? new Date().toISOString().slice(0, 10);
  return db.select().from(appointments).where(sql`DATE(${appointments.startsAt}) = ${day}`).orderBy(asc(appointments.startsAt));
}

export async function createAppointment(input: {
  patientId: number;
  branchId: number;
  doctorId: number;
  serviceId?: number;
  startsAt: Date;
  endsAt: Date;
  visitType: "new" | "follow_up" | "emergency" | "procedure";
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(appointments).values(input);
  const appointmentId = Number(result[0].insertId);
  const created = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  return created[0];
}

export async function hasPatientConflict(input: { patientNumber: string; phone: string }) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: patients.id }).from(patients).where(or(eq(patients.patientNumber, input.patientNumber), eq(patients.phone, input.phone))).limit(1);
  return result.length > 0;
}

export async function searchPatients(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const normalized = search?.trim();
  const where = normalized
    ? or(
        like(patients.fullName, `%${normalized}%`),
        like(patients.phone, `%${normalized}%`),
        like(patients.patientNumber, `%${normalized}%`),
      )
    : undefined;
  return db.select().from(patients).where(where).orderBy(asc(patients.fullName)).limit(50);
}

export async function createPatient(input: {
  patientNumber: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: "female" | "male" | "other";
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(patients).values(input);
  const patientId = Number(result[0].insertId);
  const created = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  return created[0];
}

export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { branches: 0, doctors: 0, patients: 0, appointmentsToday: 0, waitingPatients: 0, newPatientsThisMonth: 0, collectionsToday: "0.00" };
  const [branchResult, doctorResult, patientResult, appointmentResult, waitingResult, newPatientResult, collectionResult] = await Promise.all([
    db.select({ value: count() }).from(branches).where(eq(branches.isActive, true)),
    db.select({ value: count() }).from(doctors).where(eq(doctors.isActive, true)),
    db.select({ value: count() }).from(patients),
    db.select({ value: count() }).from(appointments).where(sql`DATE(${appointments.startsAt}) = CURRENT_DATE()`),
    db.select({ value: count() }).from(appointments).where(sql`DATE(${appointments.startsAt}) = CURRENT_DATE() AND ${appointments.status} = 'arrived'`),
    db.select({ value: count() }).from(patients).where(sql`${patients.createdAt} >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')`),
    db.select({ value: sum(payments.amount) }).from(payments).where(sql`DATE(${payments.paidAt}) = CURRENT_DATE()`),
  ]);
  return {
    branches: Number(branchResult[0]?.value ?? 0),
    doctors: Number(doctorResult[0]?.value ?? 0),
    patients: Number(patientResult[0]?.value ?? 0),
    appointmentsToday: Number(appointmentResult[0]?.value ?? 0),
    waitingPatients: Number(waitingResult[0]?.value ?? 0),
    newPatientsThisMonth: Number(newPatientResult[0]?.value ?? 0),
    collectionsToday: String(collectionResult[0]?.value ?? "0.00"),
  };
}

export async function getMedicalVisitForAttachment(visitId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: medicalVisits.id, patientId: medicalVisits.patientId }).from(medicalVisits).where(eq(medicalVisits.id, visitId)).limit(1);
  return result[0];
}

export async function assertMedicalVisitScope(input: { appointmentId: number; doctorId: number }, access: { userId: number; role: string }) {
  if (access.role === "admin" || access.role === "super_admin") return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const appointment = await db.select({ branchId: appointments.branchId }).from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1);
  if (!appointment[0]) throw new Error("Appointment not found");
  const userBranchesForScope = await db.select({ branchId: userBranches.branchId }).from(userBranches).where(and(eq(userBranches.userId, access.userId), eq(userBranches.branchId, appointment[0].branchId)));
  const doctorBranchesForScope = await db.select({ branchId: doctorBranches.branchId }).from(doctorBranches).where(and(eq(doctorBranches.doctorId, input.doctorId), eq(doctorBranches.branchId, appointment[0].branchId)));
  if (userBranchesForScope.length === 0 && doctorBranchesForScope.length === 0) throw new Error("FORBIDDEN_BRANCH_SCOPE");
}

export async function createMedicalVisit(input: { appointmentId: number; patientId: number; doctorId: number; chiefComplaint?: string; diagnosis?: string; medications?: string; followUpPlan?: string; visitNotes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(medicalVisits).values(input);
  const visitId = Number(result[0].insertId);
  const created = await db.select().from(medicalVisits).where(eq(medicalVisits.id, visitId)).limit(1);
  return created[0];
}

export async function listPatientVisits(patientId: number, access?: { userId: number; role: string }) {
  const db = await getDb();
  if (!db) return [];
  if (!access || access.role === "admin" || access.role === "super_admin") return db.select().from(medicalVisits).where(eq(medicalVisits.patientId, patientId)).orderBy(sql`${medicalVisits.recordedAt} DESC`);
  const assigned = await db.select({ branchId: userBranches.branchId }).from(userBranches).where(eq(userBranches.userId, access.userId));
  const directBranchIds = assigned.map(item => item.branchId);
  let branchIds = directBranchIds;
  if (access.role === "doctor") {
    const linkedDoctors = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, access.userId));
    const doctorIds = linkedDoctors.map(item => item.id);
    if (doctorIds.length > 0) {
      const doctorAssigned = await db.select({ branchId: doctorBranches.branchId }).from(doctorBranches).where(inArray(doctorBranches.doctorId, doctorIds));
      branchIds = Array.from(new Set([...branchIds, ...doctorAssigned.map(item => item.branchId)]));
    }
  }
  if (branchIds.length === 0) throw new Error("FORBIDDEN_BRANCH_SCOPE");
  const allVisits = await db.select({ id: medicalVisits.id }).from(medicalVisits).where(eq(medicalVisits.patientId, patientId)).limit(1);
  const scopedVisits = await db.select({ id: medicalVisits.id, appointmentId: medicalVisits.appointmentId, patientId: medicalVisits.patientId, doctorId: medicalVisits.doctorId, chiefComplaint: medicalVisits.chiefComplaint, diagnosis: medicalVisits.diagnosis, medications: medicalVisits.medications, followUpPlan: medicalVisits.followUpPlan, visitNotes: medicalVisits.visitNotes, recordedAt: medicalVisits.recordedAt, updatedAt: medicalVisits.updatedAt }).from(medicalVisits).innerJoin(appointments, eq(medicalVisits.appointmentId, appointments.id)).where(and(eq(medicalVisits.patientId, patientId), inArray(appointments.branchId, branchIds))).orderBy(sql`${medicalVisits.recordedAt} DESC`);
  if (allVisits.length > 0 && scopedVisits.length === 0) throw new Error("FORBIDDEN_BRANCH_SCOPE");
  return scopedVisits;
}

export async function listMedicalAttachments(visitId: number, patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicalAttachments).where(and(eq(medicalAttachments.visitId, visitId), eq(medicalAttachments.patientId, patientId))).orderBy(sql`${medicalAttachments.uploadedAt} DESC`);
}

export async function createMedicalAttachment(input: {
  visitId: number;
  patientId: number;
  fileName: string;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  sizeBytes?: number;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const visit = await getMedicalVisitForAttachment(input.visitId);
  if (!visit || visit.patientId !== input.patientId) throw new Error("Attachment visit ownership mismatch");
  const result = await db.insert(medicalAttachments).values(input);
  const attachmentId = Number(result[0].insertId);
  const created = await db.select().from(medicalAttachments).where(eq(medicalAttachments.id, attachmentId)).limit(1);
  return created[0];
}

export async function writeAuditLog(input: {
  userId: number;
  branchId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    userId: input.userId,
    branchId: input.branchId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}
