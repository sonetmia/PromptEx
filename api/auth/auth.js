import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COOKIE = "promptex_session";
const ADMIN_COOKIE = "promptex_admin_session";
const SHORT = 8 * 60 * 60 * 1000;
const LONG = 30 * 24 * 60 * 60 * 1000;

// Built-in Super Admin credentials. Password is stored only as a scrypt hash.
const BUILTIN_ADMIN_WHATSAPP = "01797953059";
const BUILTIN_ADMIN_PASSWORD_HASH = "scrypt:7403e73bd1860b48342a4b28ea084580:ca295ebe3b3475d2e75607202d0c556fe84657e7870a15e11fd2c4655fe7925fe45e7cbcbe0335feda161a1952eab06a8303b3b84a69dc874f977fd4024a53f2";
const ADMIN_COOKIE_SECRET = BUILTIN_ADMIN_PASSWORD_HASH;

const normalizeWhatsapp = (v) => String(v || "").trim().replace(/[\s()-]/g, "");
const hashToken = (v) => crypto.createHash("sha256").update(v).digest("hex");
const signAdminPayload = (payload) => crypto.createHmac("sha256", ADMIN_COOKIE_SECRET).update(payload).digest("base64url");
const makeAdminCookie = () => {
  const payload = `admin:${Date.now()}`;
  return `${payload}.${signAdminPayload(payload)}`;
};
const verifyAdminCookie = (value) => {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !signature || !payload.startsWith("admin:")) return false;
  const expected = signAdminPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Date.now() - Number(payload.slice(6)) < LONG;
};
const verifyPassword = async (password, encoded) => {
  const [scheme, salt, stored] = String(encoded || "").split(":");
  if (scheme !== "scrypt" || !salt || !stored) return false;
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, d) => e ? reject(e) : resolve(d)));
  const expected = Buffer.from(stored, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
};
const parseCookies = (req) => Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((p) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())]; }));
const setCookie = (res, token, maxAge) => res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAge / 1000)}; Path=/; HttpOnly; SameSite=Lax; Secure`);
const setAdminCookie = (res) => res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=${encodeURIComponent(makeAdminCookie())}; Max-Age=${Math.floor(LONG / 1000)}; Path=/; HttpOnly; SameSite=Lax; Secure`);
const clearCookie = (res) => res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`);
const clearAdminCookie = (res) => res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`);
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, whatsappNumber: u.whatsappNumber, email: u.email, studentId: u.studentId, role: u.role, status: u.status });
const builtinAdminUser = { id: "builtin-super-admin", fullName: "Super Admin", whatsappNumber: BUILTIN_ADMIN_WHATSAPP, email: null, studentId: null, role: "SUPER_ADMIN", status: "APPROVED" };
const statusMessage = (s) => s === "PENDING" ? "Your account is waiting for Super Admin approval." : s === "REJECTED" ? "Your registration has been rejected. Please contact the administrator." : s === "SUSPENDED" ? "Your account has been suspended. Please contact the administrator." : "";

async function createSession(userId, remember, res) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? LONG : SHORT));
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt, rememberDevice: remember } });
  setCookie(res, token, expiresAt.getTime() - Date.now());
}
async function getSession(req) {
  const cookies = parseCookies(req);
  if (verifyAdminCookie(cookies[ADMIN_COOKIE])) return { id: "builtin-admin-session", user: builtinAdminUser };
  const token = cookies[COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date()) { await prisma.session.delete({ where: { id: session.id } }).catch(() => {}); return null; }
  return session;
}

export default async function handler(req, res) {
  try {
    const path = String(req.url || "").split("?")[0];

    if (req.method === "GET" && path.endsWith("/me")) {
      const s = await getSession(req);
      if (!s) return res.status(401).json({ error: "Not authenticated." });
      if (s.user.role === "STUDENT" && s.user.status !== "APPROVED") { await prisma.session.delete({ where: { id: s.id } }).catch(() => {}); clearCookie(res); return res.status(403).json({ error: statusMessage(s.user.status), status: s.user.status }); }
      return res.json({ user: publicUser(s.user) });
    }

    if (req.method === "POST" && path.endsWith("/admin/login")) {
      const whatsapp = normalizeWhatsapp(req.body?.whatsappNumber);
      const password = String(req.body?.password || "");
      const configured = normalizeWhatsapp(process.env.ADMIN_WHATSAPP || BUILTIN_ADMIN_WHATSAPP);
      const hash = String(process.env.ADMIN_PASSWORD_HASH || BUILTIN_ADMIN_PASSWORD_HASH).trim();
      if (whatsapp !== configured || !(await verifyPassword(password, hash))) return res.status(401).json({ error: "Invalid Super Admin credentials." });
      setAdminCookie(res);
      return res.json({ user: publicUser(builtinAdminUser) });
    }

    if (req.method === "POST" && path.endsWith("/login")) {
      const whatsapp = normalizeWhatsapp(req.body?.whatsappNumber);
      const password = String(req.body?.password || "");
      const user = await prisma.user.findUnique({ where: { whatsappNumber: whatsapp } });
      if (!user || user.role !== "STUDENT" || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: "Invalid WhatsApp number or password." });
      if (user.status !== "APPROVED") return res.status(403).json({ error: statusMessage(user.status), status: user.status });
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await createSession(user.id, Boolean(req.body?.rememberDevice), res);
      return res.json({ user: publicUser(user) });
    }

    if (req.method === "POST" && path.endsWith("/register")) {
      const fullName = String(req.body?.fullName || "").trim();
      const whatsapp = normalizeWhatsapp(req.body?.whatsappNumber);
      const email = String(req.body?.email || "").trim() || null;
      const studentId = String(req.body?.studentId || "").trim() || null;
      const password = String(req.body?.password || "");
      const confirm = String(req.body?.confirmPassword || "");
      if (!fullName || !whatsapp || !password || !confirm) return res.status(400).json({ error: "Please complete all required fields." });
      if (!/^\+?[0-9]{8,15}$/.test(whatsapp)) return res.status(400).json({ error: "Enter a valid WhatsApp number." });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
      if (password !== confirm) return res.status(400).json({ error: "Passwords do not match." });
      const duplicate = await prisma.user.findFirst({ where: { OR: [{ whatsappNumber: whatsapp }, ...(studentId ? [{ studentId }] : [])] } });
      if (duplicate) return res.status(409).json({ error: "An account with this WhatsApp number or student ID already exists." });
      const salt = crypto.randomBytes(16).toString("hex");
      const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, d) => e ? reject(e) : resolve(d)));
      const passwordHash = `scrypt:${salt}:${derived.toString("hex")}`;
      await prisma.user.create({ data: { fullName, whatsappNumber: whatsapp, email, studentId, passwordHash, role: "STUDENT", status: "PENDING" } });
      return res.status(201).json({ message: "Registration submitted successfully. Your account is waiting for Super Admin approval." });
    }

    if (req.method === "POST" && path.endsWith("/logout")) {
      const token = parseCookies(req)[COOKIE];
      if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
      clearCookie(res);
      clearAdminCookie(res);
      return res.json({ ok: true });
    }

    if (req.method === "GET" && path.endsWith("/admin/students")) {
      const s = await getSession(req);
      if (!s || s.user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Super Admin access is required." });
      try {
        const students = await prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, whatsappNumber: true, email: true, studentId: true, status: true, createdAt: true, lastLoginAt: true } });
        return res.json({ students });
      } catch (dbError) {
        console.error("Student list unavailable:", dbError);
        return res.json({ students: [] });
      }
    }

    if (req.method === "PATCH" && path.includes("/admin/students/") && path.endsWith("/status")) {
      const s = await getSession(req);
      if (!s || s.user.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Super Admin access is required." });
      const id = path.split("/admin/students/")[1].split("/status")[0]; const status = String(req.body?.status || "");
      if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) return res.status(400).json({ error: "Invalid student status." });
      const student = await prisma.user.findUnique({ where: { id } }); if (!student || student.role !== "STUDENT") return res.status(404).json({ error: "Student not found." });
      const updated = await prisma.user.update({ where: { id }, data: { status } }); if (status !== "APPROVED") await prisma.session.deleteMany({ where: { userId: id } });
      return res.json({ student: { id: updated.id, status: updated.status } });
    }

    return res.status(404).json({ error: "Not found." });
  } catch (error) {
    console.error("Auth API error:", error);
    return res.status(500).json({ error: "Authentication service is temporarily unavailable." });
  }
}
