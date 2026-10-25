"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CaseState, AgentState } from "@/lib/types";
import CampaignGraph from "./CampaignGraph";

export default function CaseView({ caseId }: { caseId: string }) {
  const [c, setC] = useState<CaseState | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/cases/${caseId}/events`);
    es.onmessage = (e) => setC(JSON.parse(e.data));
    es.onerror = () => {
      es.close();
      const t = setInterval(async () => {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.ok) {
          const next = (await res.json()) as CaseState;
          setC(next);
          if (next.status !== "running") clearInterval(t);
        }
      }, 2500);
    };
    return () => es.close();
  }, [caseId]);

  if (!c) return <div className="mono-label mt-10">loading case…</div>;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--ink)] pb-2">
        <div>
          <span className="mono-label text-[var(--red)]">case {c.id}</span>
          <span className="mono-label text-[var(--muted)] ml-3">{c.inputType}</span>
        </div>
        <StatusPill status={c.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <SessionPanel title="Recon" agent={c.recon} />
        <SessionPanel title="Bait" agent={c.bait} />
      </div>

      <Evidence c={c} />

      <section>
        <h2 className="mono-label text-[var(--red)] mb-2">Campaign graph</h2>
        <CampaignGraph c={c} />
        <MapperStatus c={c} />
      </section>

      {c.status !== "running" && (
        <Link
          href={`/case/${c.id}/report`}
          className="no-print inline-block border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-5 py-2 text-sm font-semibold"
        >
          View dossier + complaint →
        </Link>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: CaseState["status"] }) {
  const map = { running: "var(--red)", done: "var(--ink)", failed: "#8a8277" };
  return (
    <span className="mono-label px-2 py-1 border" style={{ borderColor: map[status], color: map[status] }}>
      {status}
    </span>
  );
}

function SessionPanel({ title, agent }: { title: string; agent: AgentState<any> }) {
  const live = agent.status === "running" || agent.status === "starting";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="mono-label flex items-center gap-1" style={{ color: live ? "var(--red)" : "var(--muted)" }}>
          {live && <span className="inline-block w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />}
          {agent.status}
        </span>
      </div>
      {agent.streamingUrl ? (
        <iframe
          src={agent.streamingUrl}
          className="w-full h-56 border border-[var(--line)] bg-black"
          title={`${title} live session`}
        />
      ) : (
        <div className="w-full h-56 border border-[var(--line)] bg-[#efe9db] flex items-center justify-center mono-label text-[var(--muted)]">
          {live ? "waiting for live browser…" : "no live session"}
        </div>
      )}
      <div className="mt-2 h-20 overflow-y-auto text-xs text-[var(--muted)] font-mono space-y-0.5">
        {agent.progress.slice(-8).map((p, i) => (
          <div key={i}>— {p}</div>
        ))}
        {agent.error && <div className="text-[var(--red)]">! {agent.error}</div>}
      </div>
    </div>
  );
}

function Evidence({ c }: { c: CaseState }) {
  const merge = (k: keyof NonNullable<CaseState["recon"]["result"]>) => {
    const s = new Set<string>();
    for (const r of [c.recon.result, c.bait.result]) {
      const v = (r as any)?.[k];
      if (Array.isArray(v)) v.forEach((x: string) => s.add(x));
    }
    return [...s];
  };
  const rows: [string, string[]][] = [
    ["UPI IDs", merge("upi_ids")],
    ["Phone / WhatsApp", merge("phone_numbers")],
    ["Telegram", merge("telegram_handles")],
    ["Emails", merge("emails")],
    ["Bank accounts", merge("bank_accounts")],
  ];
  const r = c.recon.result;
  return (
    <section className="card p-4">
      <h2 className="mono-label text-[var(--red)] mb-3">Extracted evidence</h2>
      {r?.scam_type && (
        <p className="text-sm mb-3">
          <b>{r.scam_type}</b>
          {r.brand_impersonated ? ` — impersonating ${r.brand_impersonated}` : ""}.{" "}
          {r.page_summary}
        </p>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, vals]) => (
            <tr key={label} className="border-b border-[var(--line)]">
              <td className="mono-label text-[var(--muted)] py-2 pr-3 align-top w-40">{label}</td>
              <td className="py-2 font-mono text-xs">{vals.length ? vals.join(", ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MapperStatus({ c }: { c: CaseState }) {
  return (
    <div className="mt-2 text-xs text-[var(--muted)] font-mono space-y-0.5">
      {c.mapper.progress.slice(-4).map((p, i) => (
        <div key={i}>— {p}</div>
      ))}
      {c.mapper.error && <div className="text-[var(--red)]">! {c.mapper.error}</div>}
    </div>
  );
}
