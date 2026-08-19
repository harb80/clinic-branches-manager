import { and, asc, count, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { sum } from "drizzle-orm";
import {
  appointments,
  appointmentStatusHistory,
  branches,
  branchWorkingHours,
  doctorSchedules,
  medicalAttachments,
  medicalVisits,
  invoices,
  invoiceItems,
  payments,
  receipts,
  syncOperations,
  services,
  branchServices,
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
import { calculateInvoiceTotals, calculatePaymentStatus } from "./validation";

let _db: ReturnType<typeof drizzle> | null = null;

export async function recordSyncOperation(input: { operationId?: string; entityType: string; entityId?: number; branchId?: number; originDeviceId?: string; status?: "pending" | "accepted" | "conflict" | "failed"; conflictReason?: string }) {
  if (!input.operationId) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(syncOperations).where(eq(syncOperations.operationId, input.operationId)).limit(1);
  if (existing[0]) {
    await db.update(syncOperations).set({ entityId: input.entityId ?? existing[0].entityId, branchId: input.branchId ?? existing[0].branchId, status: input.status ?? existing[0].status, conflictReason: input.conflictReason }).where(eq(syncOperations.operationId, input.operationId));
    return existing[0];
  }
  const result = await db.insert(syncOperations).values({ operationId: input.operationId, entityType: input.entityType, entityId: input.entityId, branchId: input.branchId, originDeviceId: input.originDeviceId ?? "browser-unknown", status: input.status ?? "accepted", conflictReason: input.conflictReason });
  const rows = await db.select().from(syncOperations).where(eq(syncOperations.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

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

export async function listUserBranchIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ branchId: userBranches.branchId }).from(userBranches).where(eq(userBranches.userId, userId));
  return rows.map(row => row.branchId);
}

export async function replaceUserBranches(userId: number, branchIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(userBranches).where(eq(userBranches.userId, userId));
  if (branchIds.length > 0) await db.insert(userBranches).values(Array.from(new Set(branchIds)).map(branchId => ({ userId, branchId })));
  return listUserBranchIds(userId);
}

export async function updateInternalUser(id: number, input: { name?: string; email?: string; username?: string; role?: "super_admin" | "branch_manager" | "doctor" | "receptionist" | "accountant"; isActive?: boolean; passwordHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(input).where(eq(users.id, id));
  const result = await db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateInternalUserWithBranches(id: number, input: { name?: string; email?: string; username?: string; role?: "super_admin" | "branch_manager" | "doctor" | "receptionist" | "accountant"; isActive?: boolean; branchIds: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { branchIds, ...userChanges } = input;
  return db.transaction(async tx => {
    await tx.update(users).set(userChanges).where(eq(users.id, id));
    await tx.delete(userBranches).where(eq(userBranches.userId, id));
    const uniqueBranchIds = Array.from(new Set(branchIds));
    if (uniqueBranchIds.length > 0) await tx.insert(userBranches).values(uniqueBranchIds.map(branchId => ({ userId: id, branchId })));
    const result = await tx.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  });
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

export async function listDoctorSchedulesForManagement(doctorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(doctorSchedules).where(eq(doctorSchedules.doctorId, doctorId)).orderBy(asc(doctorSchedules.dayOfWeek));
}

export async function saveDoctorSchedule(input: { doctorId: number; branchId: number; dayOfWeek: number; startsAt: string; endsAt: string; slotMinutes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
  const starts = toMinutes(input.startsAt);
  const ends = toMinutes(input.endsAt);
  if (ends <= starts) throw new Error("Schedule end time must be after start time");
  const existing = await db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId, input.doctorId), eq(doctorSchedules.branchId, input.branchId), eq(doctorSchedules.dayOfWeek, input.dayOfWeek), eq(doctorSchedules.isActive, true)));
  const overlaps = existing.some(schedule => starts < toMinutes(schedule.endsAt) && ends > toMinutes(schedule.startsAt));
  if (overlaps) throw new Error("Doctor schedule overlaps an existing schedule");
  const result = await db.insert(doctorSchedules).values({ ...input, isActive: true });
  const rows = await db.select().from(doctorSchedules).where(eq(doctorSchedules.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updateDoctorSchedule(input: { id: number; doctorId: number; branchId: number; dayOfWeek: number; startsAt: string; endsAt: string; slotMinutes: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
  const starts = toMinutes(input.startsAt);
  const ends = toMinutes(input.endsAt);
  if (ends <= starts) throw new Error("Schedule end time must be after start time");
  if (input.isActive) {
    const existing = await db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId, input.doctorId), eq(doctorSchedules.branchId, input.branchId), eq(doctorSchedules.dayOfWeek, input.dayOfWeek), eq(doctorSchedules.isActive, true), sql`${doctorSchedules.id} <> ${input.id}`));
    if (existing.some(schedule => starts < toMinutes(schedule.endsAt) && ends > toMinutes(schedule.startsAt))) throw new Error("Doctor schedule overlaps an existing schedule");
  }
  await db.update(doctorSchedules).set({ doctorId: input.doctorId, branchId: input.branchId, dayOfWeek: input.dayOfWeek, startsAt: input.startsAt, endsAt: input.endsAt, slotMinutes: input.slotMinutes, isActive: input.isActive }).where(eq(doctorSchedules.id, input.id));
  const rows = await db.select().from(doctorSchedules).where(eq(doctorSchedules.id, input.id)).limit(1);
  return rows[0];
}

export async function listBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(asc(branches.nameAr));
}

export async function listServices() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).orderBy(asc(services.nameAr));
}

export async function createService(input: { nameAr: string; nameEn: string; specialtyId?: number; defaultPrice: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(services).values({ ...input, isActive: true });
  const rows = await db.select().from(services).where(eq(services.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updateService(input: { id: number; nameAr?: string; nameEn?: string; specialtyId?: number | null; defaultPrice?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { id, ...changes } = input;
  await db.update(services).set(changes).where(eq(services.id, id));
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return rows[0];
}

export async function saveBranchService(input: { branchId: number; serviceId: number; price: string; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(branchServices).values(input).onDuplicateKeyUpdate({ set: { price: input.price, isActive: input.isActive } });
  const rows = await db.select().from(branchServices).where(and(eq(branchServices.branchId, input.branchId), eq(branchServices.serviceId, input.serviceId))).limit(1);
  return rows[0];
}

export async function listBranchServices(branchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ service: services, price: branchServices.price }).from(branchServices).innerJoin(services, eq(branchServices.serviceId, services.id)).where(and(eq(branchServices.branchId, branchId), eq(branchServices.isActive, true), eq(services.isActive, true))).orderBy(asc(services.nameAr));
}

export async function listBranchServicesForManagement(branchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ service: services, branchService: branchServices }).from(branchServices).innerJoin(services, eq(branchServices.serviceId, services.id)).where(eq(branchServices.branchId, branchId)).orderBy(asc(services.nameAr));
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
  if (!db) return { bookings: 0, arrived: 0, completed: 0, cancelled: 0, noShow: 0, collections: "0.00", newPatients: 0, outstanding: "0.00", refunds: "0.00", paymentMethods: {}, doctorPerformance: [] };
  const appointmentConditions = [];
  if (filters.branchId) appointmentConditions.push(eq(appointments.branchId, filters.branchId));
  if (filters.from) appointmentConditions.push(sql`${appointments.startsAt} >= ${filters.from}`);
  if (filters.to) appointmentConditions.push(sql`${appointments.startsAt} <= ${filters.to}`);
  const appointmentRows = await db.select({ status: appointments.status, doctorId: appointments.doctorId, doctorNameAr: doctors.licenseNumber, doctorNameEn: doctors.licenseNumber }).from(appointments).leftJoin(doctors, eq(appointments.doctorId, doctors.id)).where(appointmentConditions.length ? and(...appointmentConditions) : undefined);
  const paymentConditions = [];
  if (filters.branchId) paymentConditions.push(eq(payments.branchId, filters.branchId));
  if (filters.from) paymentConditions.push(sql`${payments.paidAt} >= ${filters.from}`);
  if (filters.to) paymentConditions.push(sql`${payments.paidAt} <= ${filters.to}`);
  const paymentRows = await db.select({ amount: payments.amount, method: payments.method }).from(payments).where(paymentConditions.length ? and(...paymentConditions) : undefined);
  const patientConditions = [];
  if (filters.from) patientConditions.push(sql`${patients.createdAt} >= ${filters.from}`);
  if (filters.to) patientConditions.push(sql`${patients.createdAt} <= ${filters.to}`);
  const patientRows = await db.select({ id: patients.id }).from(patients).where(patientConditions.length ? and(...patientConditions) : undefined);
  const invoiceConditions: any[] = [sql`${invoices.status} IN ('unpaid', 'partial')`];
  if (filters.branchId) invoiceConditions.push(eq(invoices.branchId, filters.branchId));
  if (filters.from) invoiceConditions.push(sql`${invoices.createdAt} >= ${filters.from}`);
  if (filters.to) invoiceConditions.push(sql`${invoices.createdAt} <= ${filters.to}`);
  const outstandingRows = await db.select({ total: invoices.total }).from(invoices).where(and(...invoiceConditions));
  const refundConditions: any[] = [sql`${invoices.status} = 'refunded'`];
  if (filters.branchId) refundConditions.push(eq(invoices.branchId, filters.branchId));
  if (filters.from) refundConditions.push(sql`${invoices.createdAt} >= ${filters.from}`);
  if (filters.to) refundConditions.push(sql`${invoices.createdAt} <= ${filters.to}`);
  const refundRows = await db.select({ total: invoices.total }).from(invoices).where(and(...refundConditions));
  const paymentMethods = paymentRows.reduce<Record<string, number>>((result, row) => { result[row.method] = (result[row.method] ?? 0) + Number(row.amount); return result; }, {});
  const doctorPerformance = appointmentRows.reduce<Record<number, { doctorId: number; doctorName: string; bookings: number; completed: number; noShow: number }>>((result, row) => { const doctorId = row.doctorId ?? 0; const doctorName = row.doctorNameAr ?? `Doctor #${doctorId}`; const current = result[doctorId] ?? { doctorId, doctorName, bookings: 0, completed: 0, noShow: 0 }; current.bookings += 1; if (row.status === "completed") current.completed += 1; if (row.status === "no_show") current.noShow += 1; result[doctorId] = current; return result; }, {});
  return { bookings: appointmentRows.length, arrived: appointmentRows.filter(row => row.status === "arrived").length, completed: appointmentRows.filter(row => row.status === "completed").length, cancelled: appointmentRows.filter(row => row.status === "cancelled").length, noShow: appointmentRows.filter(row => row.status === "no_show").length, collections: paymentRows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2), newPatients: patientRows.length, outstanding: outstandingRows.reduce((sum, row) => sum + Number(row.total), 0).toFixed(2), refunds: refundRows.reduce((sum, row) => sum + Number(row.total), 0).toFixed(2), paymentMethods, doctorPerformance: Object.values(doctorPerformance) };
}

export async function listInvoices(patientId?: number) {
  const db = await getDb();
  if (!db) return [];
  return patientId ? db.select().from(invoices).where(eq(invoices.patientId, patientId)).orderBy(sql`${invoices.createdAt} DESC`) : db.select().from(invoices).orderBy(sql`${invoices.createdAt} DESC`);
}

export async function createInvoice(input: { invoiceNumber: string; patientId: number; appointmentId?: number; branchId: number; subtotal: string; discount: string; total: string; createdBy: number; items?: Array<{ serviceId: number; quantity: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const itemIds = input.items?.map(item => item.serviceId) ?? [];
  if (new Set(itemIds).size !== itemIds.length) throw new Error("Each service can appear only once on an invoice");
  const itemRows = input.items?.length ? await db.select({ service: services, price: branchServices.price }).from(branchServices).innerJoin(services, eq(branchServices.serviceId, services.id)).where(and(eq(branchServices.branchId, input.branchId), inArray(branchServices.serviceId, itemIds), eq(branchServices.isActive, true), eq(services.isActive, true))) : [];
  if (input.items?.length && itemRows.length !== input.items.length) throw new Error("One or more services are not active for this branch");
  const resolvedItems = input.items?.map(item => {
    const match = itemRows.find(row => row.service.id === item.serviceId);
    if (!match) throw new Error("Service is not available for this branch");
    const amount = (Number(match.price) * item.quantity).toFixed(2);
    return { serviceId: item.serviceId, serviceNameAr: match.service.nameAr, serviceNameEn: match.service.nameEn, quantity: item.quantity, unitPrice: String(match.price), amount };
  }) ?? [];
  const calculated = resolvedItems.length ? calculateInvoiceTotals(resolvedItems.map(item => ({ unitPrice: item.unitPrice, quantity: item.quantity })), input.discount) : { subtotal: input.subtotal, total: (Number(input.subtotal) - Number(input.discount)).toFixed(2) };
  const subtotal = calculated.subtotal;
  const total = calculated.total;
  const { items: _items, ...invoiceValues } = input;
  const result = await db.insert(invoices).values({ ...invoiceValues, subtotal, total });
  const invoiceId = Number(result[0].insertId);
  if (resolvedItems.length) await db.insert(invoiceItems).values(resolvedItems.map(item => ({ ...item, invoiceId })));
  const rows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
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

export async function recordPayment(input: { invoiceId: number; patientId: number; branchId: number; amount: string; method: "cash" | "card" | "bank_transfer" | "insurance" | "other"; reference?: string; receivedBy: number; clientOperationId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.clientOperationId) {
    const existingPayment = await db.select().from(payments).where(eq(payments.clientOperationId, input.clientOperationId)).limit(1);
    if (existingPayment[0]) return existingPayment[0];
  }
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
  const paymentId = Number(result[0].insertId);
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const payment = rows[0];
  if (payment) {
    await db.insert(receipts).values({ receiptNumber: `RCT-${Date.now()}-${paymentId}-${randomUUID().slice(0, 8)}`, invoiceId: input.invoiceId, paymentId, patientId: input.patientId, branchId: input.branchId, amount: input.amount, method: input.method, reference: input.reference, issuedBy: input.receivedBy });
    await recordSyncOperation({ operationId: input.clientOperationId, entityType: "payment", entityId: payment.id, branchId: input.branchId });
  }
  return payment;
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

export async function getDoctorAvailability(input: { doctorId: number; branchId: number; date: string }) {
  const db = await getDb();
  if (!db) return [];
  const dateValue = new Date(`${input.date}T12:00:00Z`);
  const dayOfWeek = dateValue.getUTCDay();
  const schedules = await db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId, input.doctorId), eq(doctorSchedules.branchId, input.branchId), eq(doctorSchedules.dayOfWeek, dayOfWeek), eq(doctorSchedules.isActive, true))).orderBy(asc(doctorSchedules.startsAt));
  const booked = await db.select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt }).from(appointments).where(and(eq(appointments.doctorId, input.doctorId), eq(appointments.branchId, input.branchId), sql`DATE(${appointments.startsAt}) = ${input.date}`, sql`${appointments.status} NOT IN ('cancelled', 'no_show')`));
  const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
  const result: Array<{ startsAt: string; endsAt: string; label: string }> = [];
  for (const schedule of schedules) {
    const start = toMinutes(schedule.startsAt);
    const end = toMinutes(schedule.endsAt);
    const slotMinutes = schedule.slotMinutes;
    for (let minute = start; minute + slotMinutes <= end; minute += slotMinutes) {
      const startsAt = new Date(`${input.date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00Z`);
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60_000);
      const overlaps = booked.some(item => startsAt < new Date(item.endsAt) && endsAt > new Date(item.startsAt));
      if (!overlaps) result.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), label: `${startsAt.toISOString().slice(11, 16)} - ${endsAt.toISOString().slice(11, 16)}` });
    }
  }
  return result;
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
  clientOperationId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.clientOperationId) {
    const existingAppointment = await db.select().from(appointments).where(eq(appointments.clientOperationId, input.clientOperationId)).limit(1);
    if (existingAppointment[0]) return existingAppointment[0];
  }
  if (input.endsAt <= input.startsAt) throw new Error("Appointment end time must be after start time");
  const assignment = await db.select({ id: doctorBranches.id }).from(doctorBranches).where(and(eq(doctorBranches.doctorId, input.doctorId), eq(doctorBranches.branchId, input.branchId))).limit(1);
  if (!assignment[0]) throw new Error("Doctor is not assigned to this branch");
  if (input.visitType !== "emergency") {
    const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
    const dayOfWeek = input.startsAt.getUTCDay();
    const startsMinutes = input.startsAt.getUTCHours() * 60 + input.startsAt.getUTCMinutes();
    const endsMinutes = input.endsAt.getUTCHours() * 60 + input.endsAt.getUTCMinutes();
    const schedules = await db.select().from(doctorSchedules).where(and(eq(doctorSchedules.doctorId, input.doctorId), eq(doctorSchedules.branchId, input.branchId), eq(doctorSchedules.dayOfWeek, dayOfWeek), eq(doctorSchedules.isActive, true)));
    if (schedules.length === 0) throw new Error("Doctor schedule is not configured for this day");
    if (!schedules.some(schedule => startsMinutes >= toMinutes(schedule.startsAt) && endsMinutes <= toMinutes(schedule.endsAt))) throw new Error("Appointment is outside the doctor's schedule");
  }
  const overlapping = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.doctorId, input.doctorId), eq(appointments.branchId, input.branchId), sql`${appointments.status} NOT IN ('cancelled', 'no_show')`, sql`${appointments.startsAt} < ${input.endsAt}`, sql`${appointments.endsAt} > ${input.startsAt}`)).limit(1);
  if (overlapping[0]) throw new Error("Doctor already has an overlapping appointment");
  const result = await db.insert(appointments).values(input);
  const appointmentId = Number(result[0].insertId);
  const created = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  await recordSyncOperation({ operationId: input.clientOperationId, entityType: "appointment", entityId: appointmentId, branchId: input.branchId });
  return created[0];
}

export async function updateAppointmentStatus(input: { appointmentId: number; status: "booked" | "confirmed" | "arrived" | "completed" | "cancelled" | "no_show"; changedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const currentRows = await db.select().from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1);
  const current = currentRows[0];
  if (!current) throw new Error("Appointment not found");
  const allowed: Record<string, string[]> = {
    booked: ["confirmed", "arrived", "cancelled", "no_show"],
    confirmed: ["arrived", "cancelled", "no_show"],
    arrived: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  if (current.status === input.status) return current;
  if (!allowed[current.status]?.includes(input.status)) throw new Error("Invalid appointment status transition");
  await db.update(appointments).set({ status: input.status }).where(eq(appointments.id, input.appointmentId));
  await db.insert(appointmentStatusHistory).values({ appointmentId: input.appointmentId, fromStatus: current.status, toStatus: input.status, changedBy: input.changedBy });
  const rows = await db.select().from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1);
  return rows[0];
}

export async function getPatientByClientOperationId(clientOperationId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(patients).where(eq(patients.clientOperationId, clientOperationId)).limit(1);
  return rows[0];
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
  clientOperationId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.clientOperationId) {
    const existingPatient = await db.select().from(patients).where(eq(patients.clientOperationId, input.clientOperationId)).limit(1);
    if (existingPatient[0]) return existingPatient[0];
  }
  const result = await db.insert(patients).values(input);
  const patientId = Number(result[0].insertId);
  const created = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  await recordSyncOperation({ operationId: input.clientOperationId, entityType: "patient", entityId: patientId });
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

export async function assertMedicalVisitScope(input: { appointmentId: number; patientId?: number; doctorId: number }, access: { userId: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const appointment = await db.select({ branchId: appointments.branchId, patientId: appointments.patientId, doctorId: appointments.doctorId }).from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1);
  if (!appointment[0]) throw new Error("Appointment not found");
  if ((input.patientId !== undefined && appointment[0].patientId !== input.patientId) || appointment[0].doctorId !== input.doctorId) throw new Error("Medical visit does not match appointment patient or doctor");
  if (access.role === "admin" || access.role === "super_admin") return;
  const userBranchesForScope = await db.select({ branchId: userBranches.branchId }).from(userBranches).where(and(eq(userBranches.userId, access.userId), eq(userBranches.branchId, appointment[0].branchId)));
  const doctorBranchesForScope = await db.select({ branchId: doctorBranches.branchId }).from(doctorBranches).where(and(eq(doctorBranches.doctorId, input.doctorId), eq(doctorBranches.branchId, appointment[0].branchId)));
  if (userBranchesForScope.length === 0 || doctorBranchesForScope.length === 0) throw new Error("FORBIDDEN_BRANCH_SCOPE");
}

export async function createMedicalVisit(input: { appointmentId: number; patientId: number; doctorId: number; chiefComplaint?: string; diagnosis?: string; medications?: string; followUpPlan?: string; visitNotes?: string; clientOperationId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.clientOperationId) {
    const existingVisit = await db.select().from(medicalVisits).where(eq(medicalVisits.clientOperationId, input.clientOperationId)).limit(1);
    if (existingVisit[0]) return existingVisit[0];
  }
  const result = await db.insert(medicalVisits).values(input);
  const visitId = Number(result[0].insertId);
  const created = await db.select().from(medicalVisits).where(eq(medicalVisits.id, visitId)).limit(1);
  await recordSyncOperation({ operationId: input.clientOperationId, entityType: "medical_visit", entityId: visitId });
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
