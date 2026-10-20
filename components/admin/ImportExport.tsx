"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportExport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !window.confirm(
        `Import "${file.name}"? This REPLACES the entire catalogue on the site with the file's contents. Export a backup first if unsure.`
      )
    )
      return;
    setBusy(true);
    setMsg("");
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setMsg("That file is not valid JSON — nothing was changed.");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`Import failed: ${data.error ?? res.status}. Nothing was changed.`);
      } else {
        setMsg(`Imported ${data.count} titles. The public site now shows the new catalogue.`);
        router.refresh();
      }
    } catch {
      setMsg("Import failed: network error. Nothing was changed.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10">
      <h2 className="text-base font-bold text-white">Import / Export</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Export downloads the full catalogue as one JSON file (your backup).
        Import replaces the whole catalogue with an uploaded JSON file —
        it is validated first, and a bad file changes nothing.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/admin/export"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          ⬇ Export catalogue JSON
        </a>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Importing…" : "⬆ Import catalogue JSON"}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </div>
      {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
    </div>
  );
}
