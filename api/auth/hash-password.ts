import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const password = String(req.body?.password || "");
    if (!password || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Password must be 8-128 characters." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const hash = `scrypt:${salt}:${derived.toString("hex")}`;
    return res.status(200).json({ hash });
  } catch {
    return res.status(500).json({ error: "Could not generate password hash." });
  }
}
