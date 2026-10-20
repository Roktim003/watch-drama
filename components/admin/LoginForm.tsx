"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ devPassword }: { devPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-black text-white">
        Watch<span className="text-red-500">Drama</span>{" "}
        <span className="text-base font-bold text-zinc-400">Admin</span>
      </h1>
      <form
        onSubmit={onSubmit}
        className="mt-5 rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10"
      >
        <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Admin password
        </label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-md bg-zinc-800 px-3 py-2.5 text-white outline-none ring-1 ring-white/10 focus:ring-red-500"
          placeholder="Password"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
        {devPassword && (
          <p className="mt-3 rounded-md bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-300 ring-1 ring-amber-400/30">
            ⚠ No ADMIN_PASSWORD is set, so the development default password{" "}
            <code className="font-bold">admin123</code> is active. Set a real
            password in <code>.env.local</code> before deploying.
          </p>
        )}
      </form>
    </div>
  );
}
