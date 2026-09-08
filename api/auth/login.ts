import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COOKIE = "promptex_session";
const DEVICE_COOKIE = "promptex_device";
const SHORT = 8 * 60 * 60 * 1000;
const LONG = 30 * 24 * 60 * 60 * 1000;

const normalizeWhatsapp = (v: unknown) => {
  let value = String(v || "").trim().replace(/[\s()-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (value.startsWith("8801")) value = `0${value.slice(3)}`;
  if (value.startsWith("+8801")) value = `0${value.slice(4)}`;
  return value;
};
const hashToken = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const verifyPassword = async (password: string, encoded: string) => {
  const [scheme, salt, stored] = String(encoded || "").trim().split(":");
  if (scheme !== "scrypt" || !salt || !stored || !/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]+$/i.test(stored)) return false;
  const expected = Buffer.from(stored, "hex");
  if (expected.length !== 64) return false;
  const derive = (s: string | Buffer) => new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, s, 64, (e, d) => e ? reject(e) : resolve(d)));
  const textSalt = await derive(salt);
  if (crypto.timingSafeEqual(expected, textSalt)) return true;
  const hexSalt = await derive(Buffer.from(salt, "hex"));
  return crypto.timingSafeEqual(expected, hexSalt);
};
const parseCookies = (req: any) => Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((p: string) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())]; }));
const setCookie = (res: any, name: string, token: string, maxAge: number) => res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAge / 1000)}; Path=/; HttpOnly; SameSite=Lax; Secure`);

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    const whatsapp = normalizeWhatsapp(req.body?.whatsappNumber);
    const password = String(req.body?.password || "");
    const user = await prisma.user.findUnique({ where: { whatsappNumber: whatsapp } });
    if (!user || user.role !== "STUDENT" || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: "Invalid WhatsApp number or password." });
    if (user.status === "PENDING") return res.status(403).json({ error: "Your account is waiting for Super Admin approval.", status: user.status });
    if (user.status === "REJECTED") return res.status(403).json({ error: "Your registration has been rejected. Please contact the administrator.", status: user.status });
    if (user.status === "SUSPENDED") return res.status(403).json({ error: "Your account has been suspended. Please contact the administrator.", status: user.status });

    const cookies = parseCookies(req);
    const currentDeviceToken = cookies[DEVICE_COOKIE];
    if (user.deviceTokenHash && (!currentDeviceToken || hashToken(currentDeviceToken) !== user.deviceTokenHash)) {
      return res.status(403).json({ error: "This account is already registered to another device. Please contact the administrator.", code: "DEVICE_MISMATCH" });
    }

    let deviceToken = currentDeviceToken;
    if (!user.deviceTokenHash) {
      deviceToken = crypto.randomBytes(32).toString("base64url");
      await prisma.user.update({ where: { id: user.id }, data: { deviceTokenHash: hashToken(deviceToken), deviceBoundAt: new Date(), lastLoginAt: new Date() } });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const remember = Boolean(req.body?.rememberDevice);
    const expiresAt = new Date(Date.now() + (remember ? LONG : SHORT));
    await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt, rememberDevice: remember } });
    setCookie(res, COOKIE, token, expiresAt.getTime() - Date.now());
    if (deviceToken) setCookie(res, DEVICE_COOKIE, deviceToken, LONG);
    return res.json({ user: { id: user.id, fullName: user.fullName, whatsappNumber: user.whatsappNumber, email: user.email, studentId: user.studentId, role: user.role, status: user.status } });
  } catch (error) {
    console.error("Student login API error:", error);
    return res.status(500).json({ error: "Authentication service is temporarily unavailable." });
  }
}
