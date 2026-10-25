"use client";
import { useMemo } from "react";
import { ReactFlow, Background, type Node, type Edge } from "@xyflow/react";
import type { CaseState } from "@/lib/types";
import { keyIdentifiers, caseLabel } from "@/lib/evidence";

const nodeStyle = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  border: "1.5px solid #17150f",
  borderRadius: 0,
  background: "#faf8f1",
  color: "#17150f",
  padding: 6,
};

export default function CampaignGraph({ c }: { c: CaseState }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const center = caseLabel(c);

    nodes.push({
      id: "target",
      position: { x: 0, y: 0 },
      data: { label: center },
      style: { ...nodeStyle, background: "#b3261e", color: "#fff", border: "1.5px solid #b3261e", fontWeight: 700 },
    });

    // Identifier nodes — skip the one that *is* the input (it's already the center).
    const idents = keyIdentifiers(c).filter((i) => i !== center).slice(0, 8);
    idents.forEach((ident, i) => {
      const id = `ident-${i}`;
      nodes.push({
        id,
        position: { x: -260 + (i % 2) * 520, y: 90 + Math.floor(i / 2) * 70 },
        data: { label: ident },
        style: nodeStyle,
      });
      edges.push({ id: `e-${id}`, source: "target", target: id, style: { stroke: "#4a463c" } });
    });

    c.mapper.sites.slice(0, 10).forEach((s, i) => {
      const id = `site-${i}`;
      nodes.push({
        id,
        position: { x: -320 + (i % 3) * 320, y: 320 + Math.floor(i / 3) * 80 },
        data: { label: hostOf(s.url) ?? s.url },
        style: { ...nodeStyle, borderStyle: s.source === "fetch" ? "solid" : "dashed" },
      });
      edges.push({
        id: `e-${id}`,
        source: "target",
        target: id,
        label: s.matchedOn[0],
        labelStyle: { fontSize: 9, fontFamily: "ui-monospace, monospace" },
        style: { stroke: "#b3261e" },
      });
    });
    return { nodes, edges };
  }, [c]);

  const empty = nodes.length === 1;

  return (
    <div className="h-80 card relative">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#c9c4b4" />
      </ReactFlow>
      {empty && c.status !== "running" && (
        <div className="absolute bottom-2 left-3 mono-label text-[var(--muted)]">
          no related identifiers or sites found
        </div>
      )}
    </div>
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
