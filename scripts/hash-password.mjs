import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs 'your-password'");
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64);
console.log(`scrypt:${salt}:${derived.toString("hex")}`);
