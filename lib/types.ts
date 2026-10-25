export type InputType = "url" | "upi" | "phone" | "message";

export type AgentStatus = "idle" | "starting" | "running" | "done" | "failed";

export interface Identifiers {
  upi_ids: string[];
  phone_numbers: string[];
  telegram_handles: string[];
  emails: string[];
  bank_accounts: string[];
  other_urls: string[];
}

export interface ReconResult extends Identifiers {
  is_scam: boolean | null;
  confidence: "high" | "medium" | "low" | null;
  verdict_reason: string | null;
  brand_impersonated: string | null;
  scam_type: string | null;
  page_summary: string | null;
}

/** Case-level verdict derived from recon. */
export type Verdict = "pending" | "scam" | "suspicious" | "legit";

export interface BaitResult extends Identifiers {
  form_found: boolean;
  next_page_summary: string | null;
  payment_requested: string | null;
}

export interface AgentState<T> {
  status: AgentStatus;
  runId: string | null;
  streamingUrl: string | null;
  progress: string[];
  result: T | null;
  error: string | null;
}

export interface RelatedSite {
  url: string;
  title: string | null;
  matchedOn: string[];
  snippet: string | null;
  source: "search" | "fetch";
}

export interface CaseState {
  id: string;
  createdAt: string;
  input: string;
  inputType: InputType;
  targetUrl: string | null;
  status: "running" | "done" | "failed";
  verdict: Verdict;
  recon: AgentState<ReconResult>;
  bait: AgentState<BaitResult>;
  mapper: {
    status: AgentStatus;
    progress: string[];
    sites: RelatedSite[];
    error: string | null;
  };
}

export const emptyIdentifiers = (): Identifiers => ({
  upi_ids: [],
  phone_numbers: [],
  telegram_handles: [],
  emails: [],
  bank_accounts: [],
  other_urls: [],
});
