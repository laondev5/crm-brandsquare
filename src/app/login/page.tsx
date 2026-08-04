"use client";

import { useActionState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction, type FormState } from "../actions/auth";

function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const welcome = useSearchParams().get("welcome");
  const router = useRouter();

  // The action sets the session cookie and returns; navigation happens here so
  // the cookie is already stored by the time the dashboard is requested.
  useEffect(() => {
    if (state.ok) {
      router.replace("/");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="auth-box">
      <h1>Sign in</h1>
      <p className="sub">Sign in to your dashboard</p>

      {welcome && !state.error && (
        <div className="msg ok">Password set. Sign in with your new password.</div>
      )}
      {state.error && <div className="msg err">{state.error}</div>}

      <form action={action}>
        <label className="f">
          <span>Email</span>
          <input type="email" name="email" autoComplete="email" required autoFocus />
        </label>
        <label className="f">
          <span>Password</span>
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <button className="btn" disabled={pending || !!state.ok}>
          {state.ok ? "Signing you in…" : pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth">
      <div className="auth-wrap">
        <Image src="/logo.webp" alt="Brandsquare" width={200} height={62} className="auth-logo" priority />
        <Suspense fallback={<div className="auth-box">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
