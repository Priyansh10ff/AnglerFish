"use client";
import { useMemo } from "react";
import { ReactFlow, Background, type Node, type Edge } from "@xyflow/react";
import type { CaseState } from "@/lib/types";

const nodeBase = {
  style: {
    fontFamily: "ui-monospace, monospace",
    fontSize: 11,
    border: "1.5px solid #17150f",
    borderRadius: 0,
    background: "#faf8f1",
    color: "#17150f",
    padding: 6,
  },
};

export default function CampaignGraph({ c }: { c: CaseState }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const ids = new Set<string>();
    for (const res of [c.recon.result, c.bait.result]) {
      for (const u of res?.upi_ids ?? []) ids.add(u);
      for (const p of res?.phone_numbers ?? []) ids.add(p);
      for (const t of res?.telegram_handles ?? []) ids.add(t);
    }
    if (c.inputType !== "url") ids.add(c.input);

    nodes.push({
      id: "target",
      position: { x: 0, y: 0 },
      data: { label: c.targetUrl ? hostOf(c.targetUrl) : c.input },
      ...nodeBase,
      style: { ...nodeBase.style, background: "#b3261e", color: "#fff", border: "1.5px solid #b3261e", fontWeight: 700 },
    });

    [...ids].slice(0, 8).forEach((ident, i) => {
      const id = `ident-${i}`;
      nodes.push({
        id,
        position: { x: -260 + (i % 2) * 520, y: 90 + Math.floor(i / 2) * 70 },
        data: { label: ident },
        ...nodeBase,
      });
      edges.push({ id: `e-${id}`, source: "target", target: id, style: { stroke: "#4a463c" } });
    });

    c.mapper.sites.slice(0, 10).forEach((s, i) => {
      const id = `site-${i}`;
      nodes.push({
        id,
        position: { x: -320 + (i % 3) * 320, y: 320 + Math.floor(i / 3) * 80 },
        data: { label: hostOf(s.url) ?? s.url },
        ...nodeBase,
        style: { ...nodeBase.style, borderStyle: s.source === "fetch" ? "solid" : "dashed" },
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

  return (
    <div className="h-80 card">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#c9c4b4" />
      </ReactFlow>
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
