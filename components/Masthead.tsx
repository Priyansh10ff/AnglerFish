export default function Masthead() {
  return (
    <header className="border-b-2 border-[var(--ink)] pb-3">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            ANGLERFISH
          </h1>
          <p className="text-sm mt-1">AI agents that bait scammers back.</p>
        </div>
        <span className="mono-label text-[var(--muted)]">Team Slytherinnn · TinyFish</span>
      </div>
    </header>
  );
}
