import { getCase } from "@/lib/store";
import { buildComplaint } from "@/lib/complaint";
import Report from "./Report";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(id);
  if (!c) {
    return <main className="max-w-3xl mx-auto px-6 py-10 mono-label">case not found</main>;
  }
  return <Report c={c} complaint={buildComplaint(c)} />;
}
