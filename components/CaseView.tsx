"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CaseState, AgentState } from "@/lib/types";
import { mergedIdentifiers } from "@/lib/evidence";
import CampaignGraph from "./CampaignGraph";
import { StepStrip } from "./StepGallery";

export default function CaseView({ caseId }: { caseId: string }) {
  const [c, setC] = useState<CaseState | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/cases/${caseId}/events`);
    es.onmessage = (e) => setC(JSON.parse(e.data));
    es.onerror = () => {
      es.close();
      // Stream closed (normal when the case finishes) or dropped — poll until terminal.
      const t = setInterval(async () => {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.status === 404) {
          setNotFound(true);
          clearInterval(t);
          return;
        }
        if (res.ok) {
          const next = (await res.json()) as CaseState;
          setC(next);
          if (next.status !== "running") clearInterval(t);
        }
      }, 2500);
    };
    return () => es.close();
  }, [caseId]);

  if (notFound)
    return (
      <div className="mt-10 mono-label text-[var(--red)]">
        case not found — the server restarted (cases are in-memory in this MVP).{" "}
        <Link href="/" className="underline">start a new one</Link>
      </div>
    );
  if (!c) return <div className="mono-label mt-10">loading case…</div>;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--ink)] pb-2">
        <div>
          <span className="mono-label text-[var(--red)]">case {c.id}</span>
          <span className="mono-label text-[var(--muted)] ml-3">{c.inputType}</span>
          <span className="ml-3 font-mono text-xs text-[var(--muted)] break-all">{c.targetUrl ?? c.input}</span>
        </div>
        <StatusPill status={c.status} />
      </div>

      <VerdictBanner c={c} />

      <div className="grid md:grid-cols-2 gap-5">
        <SessionPanel title="Recon" agent={c.recon} skipped={!c.targetUrl} />
        <SessionPanel title="Bait" agent={c.bait} skipped={!c.targetUrl || c.verdict === "legit"} />
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
          {c.verdict === "legit" ? "View assessment →" : "View dossier + complaint →"}
        </Link>
      )}
    </div>
  );
}

function VerdictBanner({ c }: { c: CaseState }) {
  const r = c.recon.result;
  const cfg = {
    pending: { label: "assessing…", color: "var(--muted)", bg: "transparent" },
    scam: { label: "SCAM", color: "#fff", bg: "var(--red)" },
    suspicious: { label: "SUSPICIOUS", color: "var(--red)", bg: "transparent" },
    legit: { label: "NO FRAUD INDICATORS", color: "var(--ink)", bg: "transparent" },
  }[c.verdict];
  if (c.verdict === "pending" && !c.targetUrl) return null;
  return (
    <div className="flex items-start gap-4 border border-[var(--ink)] p-3">
      <span
        className="mono-label px-2 py-1 border shrink-0"
        style={{ color: cfg.color, background: cfg.bg, borderColor: c.verdict === "legit" ? "var(--ink)" : "var(--red)" }}
      >
        {cfg.label}
      </span>
      <div className="text-sm leading-snug">
        {c.verdict === "pending" ? (
          <span className="text-[var(--muted)]">Recon is reading the page to decide whether this is a scam before any bait is sent.</span>
        ) : (
          <>
            {r?.verdict_reason}
            {r?.confidence && <span className="mono-label text-[var(--muted)] ml-2">confidence {r.confidence}</span>}
            {c.verdict === "legit" && (
              <div className="text-xs text-[var(--muted)] mt-1">
                Bait and campaign mapping were skipped — no fake data is ever submitted to a legitimate site.
              </div>
            )}
          </>
        )}
      </div>
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

function SessionPanel({ title, agent, skipped }: { title: string; agent: AgentState<unknown>; skipped: boolean }) {
  const live = agent.status === "running" || agent.status === "starting";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="mono-label flex items-center gap-1" style={{ color: live ? "var(--red)" : "var(--muted)" }}>
          {live && <span className="inline-block w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />}
          {skipped ? "skipped" : agent.status}
        </span>
      </div>

      {agent.streamingUrl ? (
        <>
          <iframe
            src={agent.streamingUrl}
            className="w-full h-56 border border-[var(--line)] bg-black"
            title={`${title} live session`}
            allow="autoplay"
          />
          <a
            href={agent.streamingUrl}
            target="_blank"
            rel="noreferrer"
            className="mono-label inline-block mt-1 text-[var(--red)] underline"
          >
            open live session in new tab ↗
          </a>
        </>
      ) : (
        <div className="w-full h-56 border border-[var(--line)] bg-[#efe9db] flex items-center justify-center mono-label text-[var(--muted)] text-center px-6">
          {skipped
            ? "no URL in input — browser agent not needed"
            : live
              ? "waiting for live browser…"
              : agent.status === "failed"
                ? "session failed"
                : "no live session"}
        </div>
      )}

      <StepStrip steps={agent.steps} />

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
  const ids = mergedIdentifiers(c);
  const rows: [string, string[]][] = [
    ["UPI IDs", ids.upi_ids],
    ["Phone / WhatsApp", ids.phone_numbers],
    ["Telegram", ids.telegram_handles],
    ["Emails", ids.emails],
    ["Bank accounts", ids.bank_accounts],
  ];
  const r = c.recon.result;
  const b = c.bait.result;
  return (
    <section className="card p-4">
      <h2 className="mono-label text-[var(--red)] mb-3">Extracted evidence</h2>
      {r?.scam_type?.trim() && (
        <p className="text-sm mb-2">
          <b>{r.scam_type}</b>
          {r.brand_impersonated ? ` — impersonating ${r.brand_impersonated}` : ""}. {r.page_summary}
        </p>
      )}
      {b?.form_found && (
        <p className="text-sm mb-3 text-[var(--muted)]">
          Bait: form submitted with fake identity. {b.next_page_summary}
          {b.payment_requested ? ` Payment demanded: ${b.payment_requested}.` : ""}
        </p>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, vals]) => (
            <tr key={label} className="border-b border-[var(--line)]">
              <td className="mono-label text-[var(--muted)] py-2 pr-3 align-top w-40">{label}</td>
              <td className="py-2 font-mono text-xs break-all">{vals.length ? vals.join(", ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!c.targetUrl && c.status !== "running" && (
        <p className="text-xs text-[var(--muted)] mt-3">
          Only the identifier you entered is available — paste the scam link itself to let the agents extract more.
        </p>
      )}
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
