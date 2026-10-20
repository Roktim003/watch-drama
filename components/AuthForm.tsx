"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergeLocalIntoAccount } from "@/lib/clientLists";

function nextPath(): string {
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  } catch {
    /* ignore */
  }
  return "/";
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { name, email, password } : { email, password }
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong — please try again");
        setBusy(false);
        return;
      }
      // Signed in — fold any guest (localStorage) lists into the account.
      await mergeLocalIntoAccount();
      window.dispatchEvent(new Event("wd-auth-changed"));
      router.push(nextPath());
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1.5 w-full rounded-md bg-zinc-800 px-3 py-2.5 text-white outline-none ring-1 ring-white/10 focus:ring-red-500";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-center text-3xl font-black text-white">
        Watch<span className="text-red-500">Drama</span>
      </h1>
      <p className="mt-1 text-center text-sm text-zinc-400">
        {mode === "login"
          ? "Welcome back — your list and progress sync with your account."
          : "Create a free account to sync your list and progress across devices."}
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10"
      >
        {mode === "signup" && (
          <div className="mb-4">
            <label className={labelCls} htmlFor="wd-name">Name</label>
            <input
              id="wd-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}
        <div className="mb-4">
          <label className={labelCls} htmlFor="wd-email">Email</label>
          <input
            id="wd-email"
            type="email"
            autoFocus={mode === "login"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="wd-password">Password</label>
          <input
            id="wd-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy
            ? mode === "login"
              ? "Signing in…"
              : "Creating account…"
            : mode === "login"
              ? "Sign in"
              : "Sign up free"}
        </button>
        <p className="mt-4 text-center text-sm text-zinc-400">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-red-400 hover:text-red-300">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-red-400 hover:text-red-300">
                Sign in
              </Link>
            </>
          )}
        </p>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Browsing and watching are always free — no account needed.
        </p>
      </form>
    </div>
  );
}
