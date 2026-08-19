import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    username: varchar("username", { length: 120 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", [
      "user",
      "admin",
      "super_admin",
      "branch_manager",
      "doctor",
      "receptionist",
      "accountant",
    ]).default("user").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({ usernameIdx: uniqueIndex("users_username_unique").on(table.username) }),
);

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 180 }).notNull(),
  nameEn: varchar("nameEn", { length: 180 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 40 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const branchWorkingHours = mysqlTable(
  "branch_working_hours",
  {
    id: int("id").autoincrement().primaryKey(),
    branchId: int("branchId").notNull(),
    dayOfWeek: int("dayOfWeek").notNull(),
    opensAt: varchar("opensAt", { length: 5 }).notNull(),
    closesAt: varchar("closesAt", { length: 5 }).notNull(),
    isClosed: boolean("isClosed").default(false).notNull(),
  },
  table => ({ branchDayIdx: uniqueIndex("branch_day_unique").on(table.branchId, table.dayOfWeek) }),
);

export const userBranches = mysqlTable(
  "user_branches",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    branchId: int("branchId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ userBranchIdx: uniqueIndex("user_branch_unique").on(table.userId, table.branchId) }),
);

export const specialties = mysqlTable("specialties", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 160 }).notNull(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export const doctors = mysqlTable(
  "doctors",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    specialtyId: int("specialtyId").notNull(),
    licenseNumber: varchar("licenseNumber", { length: 80 }),
    phone: varchar("phone", { length: 40 }),
    consultationFee: decimal("consultationFee", { precision: 12, scale: 2 }).default("0").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ userIdx: uniqueIndex("doctors_user_unique").on(table.userId) }),
);

export const doctorBranches = mysqlTable(
  "doctor_branches",
  {
    id: int("id").autoincrement().primaryKey(),
    doctorId: int("doctorId").notNull(),
    branchId: int("branchId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ doctorBranchIdx: uniqueIndex("doctor_branch_unique").on(table.doctorId, table.branchId) }),
);

export const doctorSchedules = mysqlTable(
  "doctor_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    doctorId: int("doctorId").notNull(),
    branchId: int("branchId").notNull(),
    dayOfWeek: int("dayOfWeek").notNull(),
    startsAt: varchar("startsAt", { length: 5 }).notNull(),
    endsAt: varchar("endsAt", { length: 5 }).notNull(),
    slotMinutes: int("slotMinutes").default(30).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
  },
  table => ({ scheduleIdx: index("doctor_schedule_idx").on(table.doctorId, table.branchId, table.dayOfWeek) }),
);

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 180 }).notNull(),
  nameEn: varchar("nameEn", { length: 180 }).notNull(),
  specialtyId: int("specialtyId"),
  defaultPrice: decimal("defaultPrice", { precision: 12, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export const branchServices = mysqlTable(
  "branch_services",
  {
    id: int("id").autoincrement().primaryKey(),
    branchId: int("branchId").notNull(),
    serviceId: int("serviceId").notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
  },
  table => ({ branchServiceIdx: uniqueIndex("branch_service_unique").on(table.branchId, table.serviceId) }),
);

export const patients = mysqlTable(
  "patients",
  {
    id: int("id").autoincrement().primaryKey(),
    clientOperationId: varchar("clientOperationId", { length: 100 }).unique(),
    patientNumber: varchar("patientNumber", { length: 40 }).notNull().unique(),
    fullName: varchar("fullName", { length: 220 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull().unique(),
    email: varchar("email", { length: 320 }),
    dateOfBirth: timestamp("dateOfBirth"),
    gender: mysqlEnum("gender", ["female", "male", "other"]).default("female").notNull(),
    address: text("address"),
    emergencyContact: varchar("emergencyContact", { length: 160 }),
    allergies: text("allergies"),
    chronicConditions: text("chronicConditions"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ patientSearchIdx: index("patient_search_idx").on(table.fullName, table.phone) }),
);

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  clientOperationId: varchar("clientOperationId", { length: 100 }).unique(),
    patientId: int("patientId").notNull(),
    branchId: int("branchId").notNull(),
    doctorId: int("doctorId").notNull(),
    serviceId: int("serviceId"),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    status: mysqlEnum("status", ["booked", "confirmed", "arrived", "completed", "cancelled", "no_show"]).default("booked").notNull(),
    visitType: mysqlEnum("visitType", ["new", "follow_up", "emergency", "procedure"]).default("new").notNull(),
    notes: text("notes"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ calendarIdx: index("appointments_calendar_idx").on(table.branchId, table.doctorId, table.startsAt) }),
);

export const appointmentStatusHistory = mysqlTable("appointment_status_history", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  fromStatus: varchar("fromStatus", { length: 30 }),
  toStatus: varchar("toStatus", { length: 30 }).notNull(),
  changedBy: int("changedBy").notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
});

export const medicalVisits = mysqlTable("medical_visits", {
  id: int("id").autoincrement().primaryKey(),
  clientOperationId: varchar("clientOperationId", { length: 100 }).unique(),
    appointmentId: int("appointmentId").notNull().unique(),
    patientId: int("patientId").notNull(),
    doctorId: int("doctorId").notNull(),
    chiefComplaint: text("chiefComplaint"),
    diagnosis: text("diagnosis"),
    medications: text("medications"),
    followUpPlan: text("followUpPlan"),
    visitNotes: text("visitNotes"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ visitPatientIdx: index("medical_visits_patient_idx").on(table.patientId, table.recordedAt) }),
);

export const medicalAttachments = mysqlTable(
  "medical_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    visitId: int("visitId").notNull(),
    patientId: int("patientId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1000 }).notNull(),
    sizeBytes: int("sizeBytes"),
    uploadedBy: int("uploadedBy").notNull(),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  },
  table => ({ visitAttachmentIdx: index("visit_attachment_idx").on(table.visitId) }),
);

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  patientId: int("patientId").notNull(),
  appointmentId: int("appointmentId"),
  branchId: int("branchId").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["unpaid", "partial", "paid", "refunded", "cancelled"]).default("unpaid").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const invoiceItems = mysqlTable("invoice_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  serviceId: int("serviceId"),
  serviceNameAr: varchar("serviceNameAr", { length: 180 }).notNull(),
  serviceNameEn: varchar("serviceNameEn", { length: 180 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  clientOperationId: varchar("clientOperationId", { length: 100 }).unique(),
  invoiceId: int("invoiceId").notNull(),
  patientId: int("patientId").notNull(),
  branchId: int("branchId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["cash", "card", "bank_transfer", "insurance", "other"]).notNull(),
  reference: varchar("reference", { length: 120 }),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  receivedBy: int("receivedBy").notNull(),
});

export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  receiptNumber: varchar("receiptNumber", { length: 60 }).notNull().unique(),
  invoiceId: int("invoiceId").notNull(),
  paymentId: int("paymentId").notNull().unique(),
  patientId: int("patientId").notNull(),
  branchId: int("branchId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["cash", "card", "bank_transfer", "insurance", "other"]).notNull(),
  reference: varchar("reference", { length: 120 }),
  issuedBy: int("issuedBy").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
});

export const syncOperations = mysqlTable("sync_operations", {
  id: int("id").autoincrement().primaryKey(),
  operationId: varchar("operationId", { length: 100 }).notNull().unique(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId"),
  branchId: int("branchId"),
  originDeviceId: varchar("originDeviceId", { length: 120 }).notNull(),
  schemaVersion: int("schemaVersion").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "conflict", "failed"]).default("pending").notNull(),
  conflictReason: text("conflictReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    branchId: int("branchId"),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: int("entityId"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ auditEntityIdx: index("audit_entity_idx").on(table.entityType, table.entityId) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type MedicalVisit = typeof medicalVisits.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
