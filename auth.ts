import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Express, Request, Response, NextFunction } from "express";
import { PrismaClient, Role, StudentStatus } from "@prisma/client";

const scrypt = promisify(crypto.scrypt);
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const SESSION_COOKIE = "promptex_session";
const SHORT_SESSION_MS = 8 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

type AuthUser = {
  id: string;
  fullName: string;
  whatsappNumber: string;
  email: string | null;
  studentId: string | null;
  role: Role;
  status: StudentStatus;
};

function normalizeWhatsapp(value: string) { return value.trim().replace(/[\s()-]/g, ""); }
function validWhatsapp(value: string) { return /^\+?[0-9]{8,15}$/.test(value); }
function validEmail(value: string) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, stored] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !stored) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(stored, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function parseCookies(req: Request) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    const key = index >= 0 ? part.slice(0, index).trim() : part.trim();
    const value = index >= 0 ? decodeURIComponent(part.slice(index + 1).trim()) : "";
    return [key, value];
  }));
}

function setSessionCookie(res: Response, token: string, maxAgeMs: number) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAgeMs / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
}
function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
}

async function createSession(userId: string, rememberDevice: boolean, res: Response) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (rememberDevice ? REMEMBER_SESSION_MS : SHORT_SESSION_MS));
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt, rememberDevice } });
  setSessionCookie(res, token, expiresAt.getTime() - Date.now());
}

async function getSession(req: Request) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session;
}

function publicUser(user: AuthUser) {
  return { id: user.id, fullName: user.fullName, whatsappNumber: user.whatsappNumber, email: user.email, studentId: user.studentId, role: user.role, status: user.status };
}
function statusMessage(status: StudentStatus) {
  if (status === "PENDING") return "Your account is waiting for Super Admin approval.";
  if (status === "REJECTED") return "Your registration has been rejected. Please contact the administrator.";
  if (status === "SUSPENDED") return "Your account has been suspended. Please contact the administrator.";
  return "";
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Your session has expired. Please log in again." });
    if (session.user.role === "STUDENT" && session.user.status !== "APPROVED") {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      clearSessionCookie(res);
      return res.status(403).json({ error: statusMessage(session.user.status), status: session.user.status });
    }
    (req as any).authUser = session.user;
    (req as any).authSessionId = session.id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication service is temporarily unavailable." });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    const user = (req as any).authUser as AuthUser | undefined;
    if (!user || user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Super Admin access is required." });
    next();
  });
}

async function provisionAdmin() {
  const whatsapp = normalizeWhatsapp(process.env.ADMIN_WHATSAPP || "");
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!whatsapp || !passwordHash) return null;
  const existing = await prisma.user.findUnique({ where: { whatsappNumber: whatsapp } });
  if (existing) {
    if (existing.role !== "SUPER_ADMIN") throw new Error("ADMIN_WHATSAPP is already registered as a student.");
    return existing;
  }
  return prisma.user.create({ data: { fullName: "Super Admin", whatsappNumber: whatsapp, passwordHash, role: "SUPER_ADMIN", status: "APPROVED" } });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const fullName = String(req.body?.fullName || "").trim();
      const whatsappNumber = normalizeWhatsapp(String(req.body?.whatsappNumber || ""));
      const email = String(req.body?.email || "").trim() || null;
      const studentId = String(req.body?.studentId || "").trim() || null;
      const password = String(req.body?.password || "");
      const confirmPassword = String(req.body?.confirmPassword || "");
      if (!fullName || !whatsappNumber || !password || !confirmPassword) return res.status(400).json({ error: "Please complete all required fields." });
      if (!validWhatsapp(whatsappNumber)) return res.status(400).json({ error: "Enter a valid WhatsApp number." });
      if (!validEmail(email || "")) return res.status(400).json({ error: "Enter a valid email address." });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
      if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
      const duplicate = await prisma.user.findFirst({ where: { OR: [{ whatsappNumber }, ...(studentId ? [{ studentId }] : [])] } });
      if (duplicate) return res.status(409).json({ error: "An account with this WhatsApp number or student ID already exists." });
      await prisma.user.create({ data: { fullName, whatsappNumber, email, studentId, passwordHash: await hashPassword(password), role: "STUDENT", status: "PENDING" } });
      res.status(201).json({ message: "Registration submitted successfully. Your account is waiting for Super Admin approval." });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration could not be completed. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const whatsappNumber = normalizeWhatsapp(String(req.body?.whatsappNumber || ""));
      const password = String(req.body?.password || "");
      const rememberDevice = Boolean(req.body?.rememberDevice);
      const user = await prisma.user.findUnique({ where: { whatsappNumber } });
      if (!user || user.role !== "STUDENT" || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: "Invalid WhatsApp number or password." });
      if (user.status !== "APPROVED") return res.status(403).json({ error: statusMessage(user.status), status: user.status });
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await createSession(user.id, rememberDevice, res);
      res.json({ user: publicUser(user) });
    } catch (error) {
      console.error("Student login error:", error);
      res.status(500).json({ error: "Login service is temporarily unavailable." });
    }
  });

  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const whatsappNumber = normalizeWhatsapp(String(req.body?.whatsappNumber || ""));
      const password = String(req.body?.password || "");
      const configuredWhatsapp = normalizeWhatsapp(process.env.ADMIN_WHATSAPP || "");
      const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim() || "";
      if (!configuredWhatsapp || !configuredHash) return res.status(503).json({ error: "Super Admin is not configured yet." });
      if (whatsappNumber !== configuredWhatsapp || !(await verifyPassword(password, configuredHash))) return res.status(401).json({ error: "Invalid Super Admin credentials." });
      const admin = await provisionAdmin();
      if (!admin) return res.status(503).json({ error: "Super Admin is not configured yet." });
      await prisma.user.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
      await createSession(admin.id, true, res);
      res.json({ user: publicUser(admin) });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Super Admin login is temporarily unavailable." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: "Not authenticated." });
      if (session.user.role === "STUDENT" && session.user.status !== "APPROVED") {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        clearSessionCookie(res);
        return res.status(403).json({ error: statusMessage(session.user.status), status: session.user.status });
      }
      res.json({ user: publicUser(session.user) });
    } catch (error) {
      console.error("Session lookup error:", error);
      res.status(500).json({ error: "Authentication service is temporarily unavailable." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = parseCookies(req)[SESSION_COOKIE];
      if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (error) {
      console.error("Logout error:", error);
      clearSessionCookie(res);
      res.json({ ok: true });
    }
  });

  app.get("/api/admin/students", requireAdmin, async (_req, res) => {
    try {
      const students = await prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, whatsappNumber: true, email: true, studentId: true, status: true, createdAt: true, lastLoginAt: true } });
      res.json({ students });
    } catch (error) {
      console.error("Admin students error:", error);
      res.status(500).json({ error: "Could not load students." });
    }
  });

  app.patch("/api/admin/students/:id/status", requireAdmin, async (req, res) => {
    try {
      const status = String(req.body?.status || "") as StudentStatus;
      if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) return res.status(400).json({ error: "Invalid student status." });
      const student = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!student || student.role !== "STUDENT") return res.status(404).json({ error: "Student not found." });
      const updated = await prisma.user.update({ where: { id: student.id }, data: { status } });
      if (status !== "APPROVED") await prisma.session.deleteMany({ where: { userId: student.id } });
      res.json({ student: { id: updated.id, status: updated.status } });
    } catch (error) {
      console.error("Status update error:", error);
      res.status(500).json({ error: "Could not update student status." });
    }
  });
}
