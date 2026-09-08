# PromptEx authentication setup

The authentication layer uses Prisma + PostgreSQL, password hashing with Node `scrypt`, and opaque HTTP-only session cookies.

## 1. Configure PostgreSQL

Set `DATABASE_URL` to a PostgreSQL connection string in Vercel Environment Variables.

## 2. Configure Super Admin

Set:

- `ADMIN_WHATSAPP`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

Generate a password hash locally without putting the password in source control:

```bash
node scripts/hash-password.mjs 'your-admin-password'
```

Copy the resulting `scrypt:...` value into `ADMIN_PASSWORD_HASH`.

The Super Admin database record is provisioned on the first successful Super Admin login. No admin credential is shipped to the browser.

## 3. Run the database migration

```bash
npx prisma migrate deploy
```

The production migration is committed under `prisma/migrations/20260908100000_init`.

## 4. Build

```bash
npm install
npm run build
```

The build runs `prisma generate` before the existing Vite + Express build.

## Access rules

- New student registrations start as `PENDING` and are never auto-logged in.
- Only `APPROVED` students can enter PromptEx.
- `REJECTED` and `SUSPENDED` students are blocked.
- Admin APIs require a `SUPER_ADMIN` session.
- Passwords are never stored in localStorage or sent back to the client.
- Session tokens are random opaque values; only their SHA-256 hashes are stored in PostgreSQL.
- Remembered sessions last 30 days; normal sessions last 8 hours.
