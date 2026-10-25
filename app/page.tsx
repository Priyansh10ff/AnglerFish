import Masthead from "@/components/Masthead";
import NewCase from "@/components/NewCase";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Masthead />
      <div className="mt-8">
        <NewCase />
      </div>
      <section className="mt-10 grid grid-cols-4 gap-3 text-center">
        {[
          ["01", "Recon", "Open the site in an isolated browser; extract identifiers"],
          ["02", "Bait", "Fill the form with fake data; reveal the hidden page"],
          ["03", "Map", "Find sibling sites on the same UPI / template"],
          ["04", "Report", "Evidence PDF + pre-filled complaint"],
        ].map(([n, t, d]) => (
          <div key={n} className="card p-3 text-left">
            <div className="mono-label text-[var(--red)]">{n}</div>
            <div className="font-semibold text-sm mt-1">{t}</div>
            <div className="text-xs text-[var(--muted)] mt-1 leading-snug">{d}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
