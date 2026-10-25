import type { RunStep } from "@/lib/types";

const src = (u: string) => `/api/screenshot?u=${encodeURIComponent(u)}`;

/** Compact thumbnail strip (case page). */
export function StepStrip({ steps }: { steps: RunStep[] }) {
  const shots = steps.filter((s) => s.screenshot);
  if (!shots.length) return null;
  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
      {shots.map((s, i) => (
        <a key={i} href={src(s.screenshot!)} target="_blank" rel="noreferrer" title={s.action} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(s.screenshot!)} alt={s.action} className="h-14 w-auto border border-[var(--line)] bg-black" loading="lazy" />
        </a>
      ))}
    </div>
  );
}

/** Full-size gallery with captions (dossier). */
export function StepGallery({ title, steps }: { title: string; steps: RunStep[] }) {
  const shots = steps.filter((s) => s.screenshot);
  if (!shots.length) return null;
  return (
    <div className="mt-3">
      <div className="mono-label text-[var(--muted)] mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {shots.map((s, i) => (
          <figure key={i} className="card p-2 break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(s.screenshot!)} alt={s.action} className="w-full border border-[var(--line)] bg-black" loading="lazy" />
            <figcaption className="text-[10px] font-mono text-[var(--muted)] mt-1 leading-snug">
              {i + 1}. {s.action}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
