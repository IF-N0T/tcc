"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

type Entity = { id: string; type: string; label: string; sub?: string };
type Rel = { id: string; sourceType: string; sourceId: string; targetType: string; targetId: string; label?: string | null };

const TYPE_COLOR: Record<string, string> = {
  Person: "#1d4ed8",
  Device: "#0891b2",
  Evidence: "#7c3aed",
  Finding: "#b45309",
  CaseEvent: "#4b5563"
};

const TYPE_LABEL: Record<string, string> = {
  Person: "Pessoa",
  Device: "Dispositivo",
  Evidence: "Evidência",
  Finding: "Achado",
  CaseEvent: "Evento"
};

export default function RelationshipGraph({ entities, relationships }: { entities: Entity[]; relationships: Rel[] }) {
  const { nodes, edges } = useMemo(() => {
    const byType: Record<string, Entity[]> = {};
    entities.forEach((e) => {
      byType[e.type] = byType[e.type] ?? [];
      byType[e.type].push(e);
    });

    const columns = Object.keys(byType);
    const nodes: Node[] = [];
    columns.forEach((type, colIdx) => {
      byType[type].forEach((e, rowIdx) => {
        nodes.push({
          id: `${e.type}:${e.id}`,
          position: { x: colIdx * 260, y: rowIdx * 100 },
          data: { label: `${TYPE_LABEL[e.type] ?? e.type}\n${e.label}${e.sub ? "\n" + e.sub : ""}` },
          style: {
            border: `2px solid ${TYPE_COLOR[e.type] ?? "#6b7280"}`,
            borderRadius: 8,
            padding: 8,
            fontSize: 12,
            whiteSpace: "pre-line",
            background: "white",
            width: 200
          }
        });
      });
    });

    const edges: Edge[] = relationships.map((r) => ({
      id: r.id,
      source: `${r.sourceType}:${r.sourceId}`,
      target: `${r.targetType}:${r.targetId}`,
      label: r.label ?? undefined,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#94a3b8" },
      labelStyle: { fontSize: 11, fill: "#475569" }
    }));

    return { nodes, edges };
  }, [entities, relationships]);

  if (nodes.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
        Nenhuma entidade cadastrada ainda para exibir no mapa de relacionamentos.
      </div>
    );
  }

  return (
    <div className="h-[520px] border border-gray-200 rounded-lg overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} maxZoom={1.5}>
        <Background gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
