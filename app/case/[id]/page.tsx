import Masthead from "@/components/Masthead";
import CaseView from "@/components/CaseView";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <Masthead />
      <CaseView caseId={id} />
    </main>
  );
}
