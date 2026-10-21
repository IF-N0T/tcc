"use client";

import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  useReactFlow,
  type Edge,
  type Node
} from "reactflow";
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

function FitViewButton() {
  const flow = useReactFlow();
  return (
    <Panel position="top-right">
      <button type="button" className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50" onClick={() => flow.fitView({ padding: 0.2, duration: 300 })}>
        Enquadrar mapa
      </button>
    </Panel>
  );
}

export default function RelationshipGraph({ entities, relationships }: { entities: Entity[]; relationships: Rel[] }) {
  const [search, setSearch] = useState("");
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const types = useMemo(() => [...new Set(entities.map((entity) => entity.type))], [entities]);

  const filteredEntities = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return entities.filter((entity) => {
      if (hiddenTypes.includes(entity.type)) return false;
      if (!term) return true;
      return `${TYPE_LABEL[entity.type] ?? entity.type} ${entity.label} ${entity.sub ?? ""}`.toLocaleLowerCase("pt-BR").includes(term);
    });
  }, [entities, hiddenTypes, search]);

  const { nodes, edges } = useMemo(() => {
    const byType: Record<string, Entity[]> = {};
    filteredEntities.forEach((entity) => {
      byType[entity.type] = byType[entity.type] ?? [];
      byType[entity.type].push(entity);
    });

    const columns = Object.keys(byType);
    const nodes: Node[] = [];
    columns.forEach((type, colIdx) => {
      byType[type].forEach((entity, rowIdx) => {
        nodes.push({
          id: `${entity.type}:${entity.id}`,
          position: { x: colIdx * 270, y: rowIdx * 110 },
          data: { label: `${TYPE_LABEL[entity.type] ?? entity.type}\n${entity.label}${entity.sub ? "\n" + entity.sub : ""}` },
          style: {
            border: `2px solid ${TYPE_COLOR[entity.type] ?? "#6b7280"}`,
            borderRadius: 8,
            padding: 8,
            fontSize: 12,
            whiteSpace: "pre-line",
            background: "white",
            width: 210,
            cursor: "grab"
          }
        });
      });
    });

    const visibleIds = new Set(nodes.map((node) => node.id));
    const edges: Edge[] = relationships
      .filter((relationship) => visibleIds.has(`${relationship.sourceType}:${relationship.sourceId}`) && visibleIds.has(`${relationship.targetType}:${relationship.targetId}`))
      .map((relationship) => ({
        id: relationship.id,
        source: `${relationship.sourceType}:${relationship.sourceId}`,
        target: `${relationship.targetType}:${relationship.targetId}`,
        label: relationship.label ?? undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#64748b", strokeWidth: 1.5 },
        labelStyle: { fontSize: 11, fill: "#334155" },
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 }
      }));

    return { nodes, edges };
  }, [filteredEntities, relationships]);

  const selectedStillVisible = selectedEntity && filteredEntities.some((entity) => entity.id === selectedEntity.id && entity.type === selectedEntity.type);

  return (
    <section className="space-y-3">
      <div className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            Exibindo {filteredEntities.length} de {entities.length} itens · {edges.length} conexões
          </div>
          <label className="sr-only" htmlFor="relationship-search">Filtrar itens do mapa</label>
          <input
            id="relationship-search"
            className="input w-full sm:w-72"
            placeholder="Localizar pessoa, dispositivo ou item..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo de item">
            {types.map((type) => {
              const visible = !hiddenTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={visible}
                  onClick={() => setHiddenTypes((current) => visible ? [...current, type] : current.filter((item) => item !== type))}
                  className={`rounded-full border px-2.5 py-1 text-xs ${visible ? "border-gray-300 bg-white text-gray-700" : "border-gray-200 bg-gray-100 text-gray-400"}`}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] ?? "#6b7280" }} />
                  {TYPE_LABEL[type] ?? type}
                </button>
              );
            })}
            {hiddenTypes.length > 0 && (
              <button type="button" className="px-2 py-1 text-xs text-brand-700 hover:underline" onClick={() => setHiddenTypes([])}>
                Mostrar todos
              </button>
            )}
          </div>
        )}
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-sm text-gray-500">
          {entities.length === 0
            ? "Nenhuma entidade cadastrada ainda para exibir no mapa."
            : "Nenhum item corresponde aos filtros atuais. Limpe a busca ou reative um tipo."}
        </div>
      ) : (
        <div className="h-[560px] overflow-hidden rounded-lg border border-gray-200">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.15}
            maxZoom={2}
            onNodeClick={(_, node) => {
              setSelectedEntity(entities.find((entity) => `${entity.type}:${entity.id}` === node.id) ?? null);
            }}
            onPaneClick={() => setSelectedEntity(null)}
            panOnDrag
            zoomOnScroll
            nodesDraggable
          >
            <Background gap={20} color="#cbd5e1" />
            <MiniMap pannable zoomable nodeColor={(node) => TYPE_COLOR[node.id.split(":")[0]] ?? "#6b7280"} />
            <Controls showInteractive={false} />
            <FitViewButton />
          </ReactFlow>
        </div>
      )}
      {selectedStillVisible && selectedEntity && (
        <p className="text-xs text-gray-600">
          Selecionado: <span className="font-medium">{TYPE_LABEL[selectedEntity.type] ?? selectedEntity.type} — {selectedEntity.label}</span>
          {selectedEntity.sub ? ` (${selectedEntity.sub})` : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500" aria-label="Legenda do mapa">
        {types.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] ?? "#6b7280" }} />
            {TYPE_LABEL[type] ?? type}
          </span>
        ))}
      </div>
    </section>
  );
}
