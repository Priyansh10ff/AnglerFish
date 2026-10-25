"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  "https://",
  "scampay@okaxis",
  "9876543210",
];

export default function NewCase() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    if (input.trim().length < 3) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed to start case");
      router.push(`/case/${data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <label className="mono-label text-[var(--red)]">Paste a scam</label>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="A scam link, UPI ID, phone number, or a forwarded WhatsApp message…"
        className="w-full h-28 mt-2 p-3 bg-[var(--paper)] border border-[var(--ink)] text-sm resize-none outline-none"
      />
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="mono-label border border-[var(--line)] px-2 py-1 text-[var(--muted)] hover:border-[var(--ink)]"
            >
              {ex || "url"}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={busy || input.trim().length < 3}
          className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-6 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "starting…" : "Investigate →"}
        </button>
      </div>
      {err && <p className="text-[var(--red)] text-xs mt-2 font-mono">{err}</p>}
      <p className="text-[var(--muted)] text-xs mt-3 leading-relaxed">
        Anglerfish only observes and reports. All browsing happens inside isolated TinyFish remote
        sessions with fake test data — never on your device, never with real details.
      </p>
    </div>
  );
}
