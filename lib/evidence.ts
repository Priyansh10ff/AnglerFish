// Single source of truth for "what identifiers does this case have".
// Merges recon + bait results with the identifier the user typed (UPI / phone),
// so a bare-UPI case still shows that UPI in the table, graph and complaint.
import type { CaseState, Identifiers } from "./types";
import { emptyIdentifiers } from "./types";

export function mergedIdentifiers(c: CaseState): Identifiers {
  const out = emptyIdentifiers();
  const keys = Object.keys(out) as (keyof Identifiers)[];
  for (const res of [c.recon.result, c.bait.result]) {
    if (!res) continue;
    for (const k of keys) {
      for (const v of res[k] ?? []) {
        const s = String(v).trim();
        if (s && !out[k].includes(s)) out[k].push(s);
      }
    }
  }
  const input = c.input.trim();
  if (c.inputType === "upi" && !out.upi_ids.includes(input)) out.upi_ids.unshift(input);
  if (c.inputType === "phone" && !out.phone_numbers.includes(input)) out.phone_numbers.unshift(input);
  return out;
}

/** Flat list of the identifiers worth graphing / searching for. */
export function keyIdentifiers(c: CaseState): string[] {
  const m = mergedIdentifiers(c);
  return [...m.upi_ids, ...m.phone_numbers, ...m.telegram_handles];
}

/** Label for the case's central node. */
export function caseLabel(c: CaseState): string {
  if (c.targetUrl) {
    try {
      return new URL(c.targetUrl).hostname;
    } catch {
      return c.targetUrl;
    }
  }
  return c.input.trim();
}
