import { and, asc, count, eq, like, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appointments,
  branches,
  medicalAttachments,
  medicalVisits,
  doctors,
  InsertUser,
  patients,
  users,
  auditLogs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

export async function listBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(asc(branches.nameAr));
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
  if (!db) return { branches: 0, doctors: 0, patients: 0, appointmentsToday: 0 };
  const [branchResult, doctorResult, patientResult, appointmentResult] = await Promise.all([
    db.select({ value: count() }).from(branches).where(eq(branches.isActive, true)),
    db.select({ value: count() }).from(doctors).where(eq(doctors.isActive, true)),
    db.select({ value: count() }).from(patients),
    db.select({ value: count() }).from(appointments).where(sql`DATE(${appointments.startsAt}) = CURRENT_DATE()`),
  ]);
  return {
    branches: Number(branchResult[0]?.value ?? 0),
    doctors: Number(doctorResult[0]?.value ?? 0),
    patients: Number(patientResult[0]?.value ?? 0),
    appointmentsToday: Number(appointmentResult[0]?.value ?? 0),
  };
}

export async function getMedicalVisitForAttachment(visitId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ id: medicalVisits.id, patientId: medicalVisits.patientId }).from(medicalVisits).where(eq(medicalVisits.id, visitId)).limit(1);
  return result[0];
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
