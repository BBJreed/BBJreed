"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type ConnData = { accounts: { provider: string }[]; factCount: number };

const futureIntegrations = [
  { name: "Bank accounts (Plaid)", note: "Live transaction sync — schema is ready, API not wired up yet." },
  { name: "Notion", note: "Pull existing notes/pages in as context." },
  { name: "Spotify / Strava / etc.", note: "Optional signal sources for habits and routine." },
];

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnData | null>(null);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/connections");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  const connectedProviders = new Set(data?.accounts.map((a) => a.provider) ?? []);

  async function importMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!importText.trim()) return;
    const res = await fetch("/api/memory/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: importText }),
    });
    const result = await res.json();
    setImportResult(res.ok ? `Imported ${result.imported} fact(s).` : "Import failed.");
    setImportText("");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Connections</h1>
      <p className="mt-1 text-sm text-ink/60">
        Link sign-in providers to one identity, and bring memory in from other AI tools.
      </p>

      <div className="card mt-6">
        <h2 className="font-medium">Sign-in providers</h2>
        <p className="mt-1 text-sm text-ink/60">
          Linking works when both providers report the same verified email address.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className={connectedProviders.has("google") ? "btn-secondary" : "btn"}
            onClick={() => signIn("google")}
          >
            {connectedProviders.has("google") ? "Google connected" : "Connect Google"}
          </button>
          <button
            className={connectedProviders.has("github") ? "btn-secondary" : "btn"}
            onClick={() => signIn("github")}
          >
            {connectedProviders.has("github") ? "GitHub connected" : "Connect GitHub"}
          </button>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-medium">Import memory from another AI</h2>
        <p className="mt-1 text-sm text-ink/60">
          Paste a memory/preferences export — JSON like{" "}
          <code>{`[{"key":"...","value":"..."}]`}</code>, or just plain text, one fact per
          line. Currently {data?.factCount ?? 0} fact(s) stored.
        </p>
        <form onSubmit={importMemory} className="mt-3 flex flex-col gap-2">
          <textarea
            className="input min-h-[100px]"
            placeholder='e.g. "Prefers concise answers" or [{"key":"role","value":"Software engineer"}]'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className="btn self-start" type="submit">
            Import
          </button>
          {importResult && <p className="text-xs text-ink/60">{importResult}</p>}
        </form>
      </div>

      <div className="card mt-4">
        <h2 className="font-medium">Planned integrations</h2>
        <ul className="mt-2 space-y-2 text-sm text-ink/70">
          {futureIntegrations.map((f) => (
            <li key={f.name}>
              <span className="font-medium text-ink">{f.name}:</span> {f.note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
