import { parse } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { getUserById } from "./db";
import { ENV } from "./_core/env";

export const INTERNAL_SESSION_COOKIE = "clinic_internal_session";

function secretKey() {
  return new TextEncoder().encode(ENV.cookieSecret || "clinic-development-secret");
}

export async function createInternalSession(user: User) {
  return new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function getInternalUser(req: Request) {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies[INTERNAL_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId)) return null;
    return (await getUserById(userId)) ?? null;
  } catch {
    return null;
  }
}

export function setInternalSessionCookie(res: Response, req: Request, token: string) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const secure = req.protocol === "https" || forwardedProto === "https";
  res.cookie(INTERNAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 1000 * 60 * 60 * 12,
    path: "/",
  });
}

export function clearInternalSessionCookie(res: Response, req: Request) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const secure = req.protocol === "https" || forwardedProto === "https";
  res.clearCookie(INTERNAL_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
  });
}
