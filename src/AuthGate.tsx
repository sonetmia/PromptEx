import React, { FormEvent, useEffect, useState } from "react";
import App from "./App";
import "./AuthGate.css";

type User = { id: string; fullName: string; whatsappNumber: string; email: string | null; studentId: string | null; role: "STUDENT" | "SUPER_ADMIN"; status: string };
type Student = User & { createdAt: string; lastLoginAt: string | null };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<"login" | "register" | "admin">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api("/api/auth/me").then((d) => setUser(d.user)).catch(() => undefined).finally(() => setChecking(false)); }, []);
  if (checking) return <FullScreen><Spinner /></FullScreen>;
  if (user?.role === "STUDENT" && user.status === "APPROVED") return <App />;
  if (user?.role === "SUPER_ADMIN") return <AdminDashboard user={user} onLogout={async () => { await api("/api/auth/logout", { method: "POST" }); setUser(null); }} />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    const form = new FormData(e.currentTarget); const body = Object.fromEntries(form.entries());
    try {
      if (screen === "register") { const d = await api("/api/auth/register", { method: "POST", body: JSON.stringify(body) }); setSuccess(d.message); setScreen("login"); }
      else if (screen === "admin") { const d = await api("/api/auth/admin/login", { method: "POST", body: JSON.stringify(body) }); setUser(d.user); }
      else { const d = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ ...body, rememberDevice: form.get("rememberDevice") === "on" }) }); setUser(d.user); }
    } catch (err: any) { setError(err.message || "Unable to continue."); } finally { setBusy(false); }
  };

  return <FullScreen><div className="auth-shell">
    <div className="auth-brand"><div className="auth-logo">P</div><div><h1>PromptEx</h1><p>Secure student access</p></div></div>
    <div className="auth-card">
      <div className="auth-tabs"><button className={screen !== "admin" ? "active" : ""} onClick={() => { setScreen("login"); setError(""); setSuccess(""); }}>Student</button><button className={screen === "admin" ? "active" : ""} onClick={() => { setScreen("admin"); setError(""); setSuccess(""); }}>Super Admin</button></div>
      <h2>{screen === "register" ? "Create student account" : screen === "admin" ? "Super Admin login" : "Student login"}</h2>
      <p className="auth-subtitle">{screen === "register" ? "Submit your registration for administrator approval." : screen === "admin" ? "Manage student access and approvals." : "Log in to continue to PromptEx."}</p>
      {error && <div className="auth-alert error">{error}</div>}{success && <div className="auth-alert success">{success}</div>}
      <form onSubmit={submit} className="auth-form">
        {screen === "register" && <><Field name="fullName" label="Full name" required /><Field name="email" label="Email" type="email" /><Field name="studentId" label="Student / Registration ID" /></>}
        <Field name="whatsappNumber" label="WhatsApp number" placeholder="+8801XXXXXXXXX" required />
        <Field name="password" label="Password" type="password" required />
        {screen === "register" && <Field name="confirmPassword" label="Confirm password" type="password" required />}
        {screen === "login" && <label className="remember"><input name="rememberDevice" type="checkbox" /> Remember this device</label>}
        <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : screen === "register" ? "Submit registration" : "Login"}</button>
      </form>
      {screen === "login" && <button className="auth-link" onClick={() => { setScreen("register"); setError(""); setSuccess(""); }}>New student? Register here</button>}
      {screen === "register" && <button className="auth-link" onClick={() => { setScreen("login"); setError(""); }}>Already registered? Student login</button>}
    </div>
  </div></FullScreen>;
}

function Field({ name, label, type = "text", placeholder, required }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }) { return <label className="auth-field"><span>{label}{required ? " *" : ""}</span><input name={name} type={type} placeholder={placeholder} required={required} autoComplete={type === "password" ? "new-password" : "off"} /></label>; }
function FullScreen({ children }: { children: React.ReactNode }) { return <div className="auth-page">{children}</div>; }
function Spinner() { return <div className="auth-loading"><div className="auth-logo">P</div><p>Checking your session…</p></div>; }

function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [students, setStudents] = useState<Student[]>([]); const [filter, setFilter] = useState("ALL"); const [busyId, setBusyId] = useState(""); const [error, setError] = useState("");
  const load = () => api("/api/auth/admin/students").then((d) => setStudents(d.students)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const changeStatus = async (student: Student, status: string) => { if (!window.confirm(`Change ${student.fullName} to ${status.toLowerCase()}?`)) return; setBusyId(student.id); setError(""); try { await api(`/api/auth/admin/students/${student.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); } catch (e: any) { setError(e.message); } finally { setBusyId(""); } };
  const filtered = students.filter((s) => filter === "ALL" || s.status === filter);
  return <div className="admin-page"><header className="admin-header"><div><div className="admin-kicker">PromptEx</div><h1>Student Management</h1><p>Welcome, {user.fullName}</p></div><button className="admin-logout" onClick={onLogout}>Logout</button></header>
    {error && <div className="auth-alert error admin-alert">{error}</div>}
    <div className="admin-tabs">{["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((x) => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x} {x === "ALL" ? students.length : students.filter(s => s.status === x).length}</button>)}</div>
    <div className="admin-table-wrap"><table><thead><tr><th>Student</th><th>WhatsApp</th><th>Email</th><th>ID</th><th>Registered</th><th>Status</th><th>Last login</th><th>Actions</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}><td><strong>{s.fullName}</strong></td><td>{s.whatsappNumber}</td><td>{s.email || "—"}</td><td>{s.studentId || "—"}</td><td>{new Date(s.createdAt).toLocaleDateString()}</td><td><span className={`status ${s.status.toLowerCase()}`}>{s.status}</span></td><td>{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "Never"}</td><td><div className="action-row">{s.status !== "APPROVED" && <button disabled={!!busyId} onClick={() => changeStatus(s, "APPROVED")}>Approve</button>}{s.status === "PENDING" && <button disabled={!!busyId} onClick={() => changeStatus(s, "REJECTED")}>Reject</button>}{s.status === "APPROVED" && <button disabled={!!busyId} onClick={() => changeStatus(s, "SUSPENDED")}>Suspend</button>}{s.status === "SUSPENDED" && <button disabled={!!busyId} onClick={() => changeStatus(s, "APPROVED")}>Reactivate</button>}</div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No students in this view.</div>}</div>
  </div>;
}
