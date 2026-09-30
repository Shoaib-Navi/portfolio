"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="user">User name</label>
        <input id="user" name="user" className="input" autoComplete="username" required autoFocus={!state.user} defaultValue={state.user} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus={Boolean(state.user)} />
      </div>
      {state.error ? (
        <p className="hint hint--err" role="alert" style={{ marginBottom: 12 }}>
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn--pri" style={{ width: "100%" }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
