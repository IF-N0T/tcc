"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps
} from "reactflow";
import "reactflow/dist/style.css";

type Entity = { id: string; type: string; label: string; sub?: string };
type Rel = { id: string; sourceType: string; sourceId: string; targetType: string; targetId: string; label?: string | null };
type PositionRecord = { entityType: string; entityId: string; x: number; y: number };
type GraphNodeData = { typeLabel: string; label: string; sub?: string; color: string };

const TYPE_COLOR: Record<string, string> = {
  Person: "rgb(var(--info))",
  Device: "rgb(var(--brand-600))",
  Evidence: "rgb(var(--stage))",
  Finding: "rgb(var(--warn))",
  CaseEvent: "rgb(var(--text-muted))"
};

const TYPE_LABEL: Record<string, string> = {
  Person: "Pessoa",
  Device: "Dispositivo",
  Evidence: "Evidência",
  Finding: "Achado",
  CaseEvent: "Evento"
};

function EntityNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <div className="relative min-w-[190px] max-w-[230px] rounded-xl border-2 bg-[rgb(var(--surface))] px-3 py-2.5 text-[rgb(var(--text))] shadow-md" style={{ borderColor: data.color }}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[rgb(var(--surface))] !bg-[rgb(var(--text-muted))]" />
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: data.color }}>{data.typeLabel}</div>
      <div className="mt-1 break-words text-xs font-medium leading-snug">{data.label}</div>
      {data.sub && <div className="mt-1 font-mono text-[10px] text-[rgb(var(--text-muted))]">{data.sub}</div>}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[rgb(var(--surface))] !bg-[rgb(var(--text-muted))]" />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

function FitViewButton() {
  const flow = useReactFlow();
  return (
    <Panel position="top-right">
      <button type="button" className="btn-secondary btn-sm shadow-sm" onClick={() => flow.fitView({ padding: 0.2, duration: 300 })}>
        Enquadrar mapa
      </button>
    </Panel>
  );
}

function nodeId(type: string, id: string) {
  return `${type}:${id}`;
}

export default function RelationshipGraph({
  entities,
  relationships,
  positions,
  editable,
  onCreateRelationship,
  onSavePosition,
  onUpdateRelationship,
  onDeleteRelationship
}: {
  entities: Entity[];
  relationships: Rel[];
  positions: PositionRecord[];
  editable: boolean;
  onCreateRelationship: (sourceType: string, sourceId: string, targetType: string, targetId: string) => Promise<void>;
  onSavePosition: (entityType: string, entityId: string, x: number, y: number) => Promise<void>;
  onUpdateRelationship: (relationshipId: string, label: string) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const types = useMemo(() => [...new Set(entities.map((entity) => entity.type))], [entities]);

  const filteredEntities = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return entities.filter((entity) => {
      if (hiddenTypes.includes(entity.type)) return false;
      if (!term) return true;
      return `${TYPE_LABEL[entity.type] ?? entity.type} ${entity.label} ${entity.sub ?? ""}`.toLocaleLowerCase("pt-BR").includes(term);
    });
  }, [entities, hiddenTypes, search]);

  const positionMap = useMemo(
    () => new Map(positions.map((position) => [nodeId(position.entityType, position.entityId), { x: position.x, y: position.y }])),
    [positions]
  );

  const initialNodes = useMemo(() => {
    const byType: Record<string, Entity[]> = {};
    for (const entity of filteredEntities) {
      byType[entity.type] = byType[entity.type] ?? [];
      byType[entity.type].push(entity);
    }

    return Object.entries(byType).flatMap(([type, typeEntities], columnIndex) =>
      typeEntities.map((entity, rowIndex): Node<GraphNodeData> => ({
        id: nodeId(entity.type, entity.id),
        type: "entity",
        position: positionMap.get(nodeId(entity.type, entity.id)) ?? { x: columnIndex * 280, y: rowIndex * 130 },
        data: {
          typeLabel: TYPE_LABEL[entity.type] ?? entity.type,
          label: entity.label,
          sub: entity.sub,
          color: TYPE_COLOR[entity.type] ?? "rgb(var(--text-muted))"
        },
        draggable: editable
      }))
    );
  }, [filteredEntities, positionMap, editable]);

  const initialEdges = useMemo(() => {
    const visibleIds = new Set(initialNodes.map((node) => node.id));
    return relationships
      .filter((relationship) => visibleIds.has(nodeId(relationship.sourceType, relationship.sourceId)) && visibleIds.has(nodeId(relationship.targetType, relationship.targetId)))
      .map((relationship): Edge => ({
        id: relationship.id,
        source: nodeId(relationship.sourceType, relationship.sourceId),
        target: nodeId(relationship.targetType, relationship.targetId),
        label: relationship.label ?? undefined,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "rgb(var(--text-muted))", strokeWidth: 2 },
        labelStyle: { fontSize: 11, fill: "rgb(var(--text))" },
        labelBgStyle: { fill: "rgb(var(--surface))", fillOpacity: 0.95 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        data: { relationshipId: relationship.id }
      }));
  }, [initialNodes, relationships]);

  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => setNodes(initialNodes), [initialNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges]);

  const selectedRelationship = relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null;
  const selectedStillVisible = selectedEntity && filteredEntities.some((entity) => entity.id === selectedEntity.id && entity.type === selectedEntity.type);

  useEffect(() => {
    setEditLabel(selectedRelationship?.label ?? "");
  }, [selectedRelationship?.id, selectedRelationship?.label]);

  function onNodesChange(changes: NodeChange[]) {
    setNodes((current) => applyNodeChanges(changes, current));
  }

  async function connect(connection: Connection) {
    if (!editable || !connection.source || !connection.target || connection.source === connection.target) return;
    const source = entities.find((entity) => nodeId(entity.type, entity.id) === connection.source);
    const target = entities.find((entity) => nodeId(entity.type, entity.id) === connection.target);
    if (!source || !target) return;

    setBusy(true);
    setError(null);
    try {
      await onCreateRelationship(source.type, source.id, target.type, target.id);
      setEdges((current) => addEdge({ ...connection, id: `pending-${Date.now()}`, label: "relacionado a" }, current));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLabel() {
    if (!selectedRelationship || !editable) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdateRelationship(selectedRelationship.id, editLabel);
      setSelectedRelationshipId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o rótulo.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedRelationship() {
    if (!selectedRelationship || !editable) return;
    setBusy(true);
    setError(null);
    try {
      await onDeleteRelationship(selectedRelationship.id);
      setSelectedRelationshipId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover a conexão.");
    } finally {
      setBusy(false);
    }
  }

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
                  className={`rounded-full border px-2.5 py-1 text-xs ${visible ? "border-gray-300 bg-[rgb(var(--surface))] text-gray-700" : "border-gray-200 bg-gray-100 text-gray-400"}`}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] ?? "rgb(var(--text-muted))" }} />
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
        {editable && <p className="text-xs text-gray-500">Arraste os itens para organizar o mapa; conecte pelo ponto lateral de um item ao outro. Clique em uma linha para editar o rótulo ou removê-la.</p>}
      </div>

      {nodes.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-sm text-gray-500">
          {entities.length === 0
            ? "Nenhuma entidade cadastrada ainda para exibir no mapa."
            : "Nenhum item corresponde aos filtros atuais. Limpe a busca ou reative um tipo."}
        </div>
      ) : (
        <div className="h-[600px] overflow-hidden rounded-lg border border-gray-200 bg-[rgb(var(--surface))]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => setEdges((current) => applyEdgeChanges(changes, current))}
            onConnect={connect}
            onNodeClick={(_, node) => {
              setSelectedEntity(entities.find((entity) => nodeId(entity.type, entity.id) === node.id) ?? null);
              setSelectedRelationshipId(null);
            }}
            onNodeDragStop={(_, node) => {
              if (!editable) return;
              const entity = entities.find((item) => nodeId(item.type, item.id) === node.id);
              if (entity) void onSavePosition(entity.type, entity.id, node.position.x, node.position.y);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedRelationshipId(edge.id);
              setSelectedEntity(null);
            }}
            onPaneClick={() => { setSelectedEntity(null); setSelectedRelationshipId(null); }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.15}
            maxZoom={2}
            panOnDrag
            zoomOnScroll
            nodesDraggable={editable}
            nodesConnectable={editable}
            edgesUpdatable={false}
            deleteKeyCode={null}
            connectionLineStyle={{ stroke: "rgb(var(--brand-500))", strokeWidth: 2 }}
            defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
          >
            <Background gap={20} color="rgb(var(--border))" />
            <MiniMap pannable zoomable nodeColor={(node) => TYPE_COLOR[node.id.split(":")[0]] ?? "rgb(var(--text-muted))"} />
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
      {selectedRelationship && editable && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="relationship-label">Rótulo da conexão selecionada</label>
            <input id="relationship-label" className="input" maxLength={120} value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
          </div>
          <button type="button" className="btn-primary" disabled={busy} onClick={saveLabel}>Salvar rótulo</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={deleteSelectedRelationship}>Remover conexão</button>
        </div>
      )}
      {error && <p className="notice-warn text-sm" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500" aria-label="Legenda do mapa">
        {types.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] ?? "rgb(var(--text-muted))" }} />
            {TYPE_LABEL[type] ?? type}
          </span>
        ))}
      </div>
    </section>
  );
}
