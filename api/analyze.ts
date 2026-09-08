import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { analyze } from "./analyze-core";

const prisma = new PrismaClient();
const SESSION_COOKIE = "promptex_session";
const DEVICE_COOKIE = "promptex_device";
const hash = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const cookies = (req: any) => Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((p: string) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())]; }));

async function requireApprovedStudent(req: any) {
  const c = cookies(req), token = c[SESSION_COOKIE];
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const s = await prisma.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!s || s.expiresAt <= new Date()) throw Object.assign(new Error("Session expired. Please log in again."), { status: 401 });
  if (s.user.role !== "STUDENT" || s.user.status !== "APPROVED") throw Object.assign(new Error("Approved student access is required."), { status: 403 });
  if (s.user.deviceTokenHash && hash(c[DEVICE_COOKIE] || "") !== s.user.deviceTokenHash) throw Object.assign(new Error("This device is not authorized for this account."), { status: 403 });
  return s;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    await requireApprovedStudent(req);
    return res.status(200).json(await analyze(req.body || {}));
  } catch (error: any) {
    const message = String(error?.message || "Failed to analyze image");
    const status = Number(error?.status) || (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.toLowerCase().includes("quota") ? 429 : 500);
    console.error("Analysis API error:", message.slice(0, 300));
    return res.status(status).json({ error: status === 429 ? "AI request quota is currently saturated. Please wait or use another configured API key." : message });
  }
}
