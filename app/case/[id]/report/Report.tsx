"use client";
import { useState } from "react";
import type { CaseState } from "@/lib/types";

export default function Report({ c, complaint }: { c: CaseState; complaint: string }) {
  const [copied, setCopied] = useState(false);
  const r = c.recon.result;
  const b = c.bait.result;
  const merge = (k: string) => {
    const s = new Set<string>();
    for (const res of [r, b]) {
      const v = (res as any)?.[k];
      if (Array.isArray(v)) v.forEach((x: string) => s.add(x));
    }
    return [...s];
  };

  async function copy() {
    await navigator.clipboard.writeText(complaint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Evidence dossier</h1>
          <p className="mono-label text-[var(--muted)] mt-1">
            case {c.id} · {new Date(c.createdAt).toLocaleString()}
          </p>
        </div>
        <button onClick={() => window.print()} className="no-print border border-[var(--ink)] px-4 py-2 text-sm font-semibold">
          Download PDF
        </button>
      </div>

      <section className="mt-6">
        <h2 className="mono-label text-[var(--red)]">Suspect</h2>
        <p className="mt-1 font-mono text-sm break-all">{c.targetUrl ?? c.input}</p>
        {r?.scam_type && (
          <p className="mt-2 text-sm">
            <b>{r.scam_type}</b>
            {r.brand_impersonated ? ` — impersonating ${r.brand_impersonated}` : ""}. {r.page_summary}
          </p>
        )}
        {b?.payment_requested && <p className="mt-1 text-sm">Payment demanded: {b.payment_requested}</p>}
      </section>

      <section className="mt-6">
        <h2 className="mono-label text-[var(--red)] mb-2">Identifiers</h2>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["UPI IDs", merge("upi_ids")],
              ["Phone / WhatsApp", merge("phone_numbers")],
              ["Telegram", merge("telegram_handles")],
              ["Emails", merge("emails")],
              ["Bank accounts", merge("bank_accounts")],
            ].map(([label, vals]) => (
              <tr key={label as string} className="border-b border-[var(--line)]">
                <td className="mono-label text-[var(--muted)] py-2 pr-3 w-40 align-top">{label as string}</td>
                <td className="py-2 font-mono text-xs">{(vals as string[]).length ? (vals as string[]).join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {c.mapper.sites.length > 0 && (
        <section className="mt-6">
          <h2 className="mono-label text-[var(--red)] mb-2">Related sites</h2>
          <ul className="text-sm space-y-1">
            {c.mapper.sites.map((s) => (
              <li key={s.url} className="font-mono text-xs break-all">
                — {s.url} <span className="text-[var(--muted)]">[{s.matchedOn.join(", ")}]</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="mono-label text-[var(--red)]">Pre-filled cybercrime.gov.in complaint</h2>
          <button onClick={copy} className="no-print mono-label border border-[var(--ink)] px-3 py-1">
            {copied ? "copied" : "copy"}
          </button>
        </div>
        <pre className="card p-4 text-xs whitespace-pre-wrap font-mono leading-relaxed">{complaint}</pre>
        <p className="text-xs text-[var(--muted)] mt-2">
          The portal requires an OTP login, so you submit this yourself at cybercrime.gov.in.
        </p>
      </section>
    </main>
  );
}
