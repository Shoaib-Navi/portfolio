import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { sessionUser } from "@/lib/admin/auth";
import { authConfigured } from "@/lib/admin/env";
import { profile } from "@/data/profile";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await sessionUser()) redirect("/admin");
  const configured = authConfigured();

  return (
    <main className="adm-login">
      <div className="card">
        <span className="adm-brand" style={{ margin: 0 }}>
          <b>{profile.initials}</b> Admin
        </span>
        <h1>Sign in</h1>
        {configured ? (
          <>
            <p className="muted" style={{ marginBottom: 20 }}>
              Edit the content of your portfolio.
            </p>
            <LoginForm />
          </>
        ) : (
          <div className="banner banner--bad" style={{ display: "block", marginTop: 14 }}>
            <p>
              <b>Sign-in isn’t configured yet.</b> Set <span className="code">ADMIN_USER</span>,{" "}
              <span className="code">ADMIN_PASSWORD_HASH</span> and <span className="code">SESSION_SECRET</span> (32+ characters),
              then restart.
            </p>
            <p style={{ marginTop: 8 }}>
              Generate the hash and secret with <span className="code">npm run admin:hash -- &quot;your password&quot;</span>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
