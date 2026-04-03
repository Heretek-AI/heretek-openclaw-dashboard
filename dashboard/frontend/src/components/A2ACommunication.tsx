import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RefreshCw, Activity, Radio, Wifi, WifiOff, ChevronRight } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: 'agent' | 'skill' | 'tool' | 'memory' | 'service';
  label: string;
  sublabel?: string;
  color?: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'a2a_communicates' | 'uses' | 'depends_on' | 'attached_to';
}

interface MemoryGraph {
  timestamp: string;
  meta: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: string[];
    edgeTypes: string[];
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface A2ALiveMessage {
  id: string;
  logged_at: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  payload_summary?: Record<string, unknown>;
  session_key?: string;
  routed_via?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const EDGE_COLORS: Record<string, string> = {
  a2a_communicates: '#60a5fa', // blue
  uses:             '#4ade80', // green
  depends_on:       '#fb923c', // orange
  attached_to:      '#c084fc', // purple
};

const EDGE_LABELS: Record<string, string> = {
  a2a_communicates: '↔',
  uses:             '→ uses',
  depends_on:       '→ needs',
  attached_to:      '→ attached',
};

const NODE_COLORS: Record<string, string> = {
  agent:   '#7B68EE',
  skill:   '#4ECDC4',
  tool:    '#FF6B6B',
  memory:  '#FFE66D',
  service: '#95E1D3',
};

const AGENT_EMOJIS: Record<string, string> = {
  steward:   '🦞',
  alpha:     '🔺',
  beta:      '🔷',
  charlie:   '🔶',
  examiner:  '🔍',
  explorer:  '🗺️',
  sentinel:  '🛡️',
  coder:     '👨‍💻',
  dreamer:   '💭',
  empath:    '💝',
  historian: '📚',
};

const POLL_INTERVAL_MS = 10_000;

// ── Fetch hook ─────────────────────────────────────────────────────────────

function useGraphData(liveMode: boolean) {
  const [graph, setGraph] = useState<MemoryGraph | null>(null);
  const [liveMessages, setLiveMessages] = useState<A2ALiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGraph = useCallback(async () => {
    try {
      const [graphRes, liveRes] = await Promise.all([
        fetch('/api/memory/graph'),
        liveMode ? fetch('/api/a2a/live').catch(() => null) : Promise.resolve(null),
      ]);

      if (!graphRes.ok) throw new Error(`Graph API ${graphRes.status}`);
      const graphData: MemoryGraph = await graphRes.json();
      setGraph(graphData);
      setError(null);
      setLastFetched(new Date());

      if (liveRes && liveRes.ok) {
        const liveData = await liveRes.json();
        setLiveMessages(Array.isArray(liveData.messages) ? liveData.messages : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [liveMode]);

  useEffect(() => {
    fetchGraph();
    if (liveMode) {
      intervalRef.current = setInterval(fetchGraph, POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchGraph, liveMode]);

  return { graph, liveMessages, loading, error, lastFetched, refresh: fetchGraph };
}

// ── SVG Graph (simple CSS/SVG, no D3 force simulation needed) ──────────────

interface GraphVisualizerProps {
  graph: MemoryGraph;
  highlightedNode: string | null;
  onNodeHover: (id: string | null) => void;
}

const NODE_W = 140;
const NODE_H = 44;
const COLS = 4;
const PAD_X = 24;
const PAD_Y = 24;

function computeLayout(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cols = COLS;
  const cellW = NODE_W + PAD_X;
  const cellH = NODE_H + PAD_Y + 20; // +20 for label below node

  // Group by type for nice layout
  const byType: Record<string, GraphNode[]> = {};
  for (const node of nodes) {
    if (!byType[node.type]) byType[node.type] = [];
    byType[node.type].push(node);
  }

  const typeOrder = ['agent', 'skill', 'tool', 'memory', 'service'];
  let row = 0;
  for (const t of typeOrder) {
    const group = byType[t] || [];
    if (group.length === 0) continue;
    group.forEach((node, i) => {
      const col = i % cols;
      positions.set(node.id, {
        x: col * cellW,
        y: row * (cellH + 30) + 20,
      });
    });
    row += Math.ceil(group.length / cols) + 1;
  }

  return positions;
}

function GraphVisualizer({ graph, highlightedNode, onNodeHover }: GraphVisualizerProps) {
  const positions = useMemo(() => computeLayout(graph.nodes), [graph.nodes]);

  // Compute SVG dimensions
  const maxX = Math.max(...Array.from(positions.values()).map(p => p.x)) + NODE_W + PAD_X;
  const maxY = Math.max(...Array.from(positions.values()).map(p => p.y)) + NODE_H + PAD_Y + 30;

  // Edges that involve the highlighted node
  const highlightEdges = useMemo(() => {
    if (!highlightedNode) return new Set<string>();
    const set = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === highlightedNode || edge.target === highlightedNode) {
        set.add(`${edge.source}→${edge.target}`);
      }
    }
    return set;
  }, [highlightedNode, graph.edges]);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  return (
    <div className="relative overflow-auto border border-border rounded-lg" style={{ minHeight: 500 }}>
      <svg
        width={Math.max(maxX, 700)}
        height={Math.max(maxY, 480)}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          {/* Arrow markers for each edge type */}
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} opacity="0.8" />
            </marker>
          ))}
          {/* Default arrow */}
          <marker
            id="arrow-default"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#888" opacity="0.8" />
          </marker>
        </defs>

        {/* Edges */}
        {graph.edges.map((edge, i) => {
          const fromPos = positions.get(edge.source);
          const toPos = positions.get(edge.target);
          if (!fromPos || !toPos) return null;

          const x1 = fromPos.x + NODE_W / 2;
          const y1 = fromPos.y + NODE_H / 2;
          const x2 = toPos.x + NODE_W / 2;
          const y2 = toPos.y + NODE_H / 2;

          const isHighlighted = highlightedNode
            ? edge.source === highlightedNode || edge.target === highlightedNode
            : false;
          const isHovered = hoveredEdge === `${edge.source}→${edge.target}`;
          const color = EDGE_COLORS[edge.type] || '#888';
          const strokeWidth = isHighlighted || isHovered ? 2.5 : 1.2;
          const opacity = highlightedNode && !isHighlighted ? 0.15 : 0.7;

          return (
            <g
              key={`${edge.source}-${edge.target}-${i}`}
              style={{ pointerEvents: 'stroke' }}
              onMouseEnter={() => setHoveredEdge(`${edge.source}→${edge.target}`)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              {/* Invisible wider line for easier hover */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="transparent"
                strokeWidth={12}
              />
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={strokeWidth}
                opacity={opacity}
                markerEnd={`url(#arrow-${edge.type})`}
              />
              {/* Edge label midpoint */}
              {(isHighlighted || isHovered) && (
                <text
                  x={(x1 + x2) / 2 + 4}
                  y={(y1 + y2) / 2 - 4}
                  fontSize="9"
                  fill={color}
                  opacity={0.9}
                >
                  {EDGE_LABELS[edge.type] || edge.type}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes as absolutely positioned cards */}
      <div className="relative" style={{ width: maxX, height: maxY }}>
        {graph.nodes.map(node => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isHighlighted = highlightedNode
            ? node.id === highlightedNode
            : false;
          const isConnected = highlightedNode
            ? graph.edges.some(e =>
                (e.source === highlightedNode && e.target === node.id) ||
                (e.target === highlightedNode && e.source === node.id)
              )
            : false;
          const dimmed = highlightedNode && !isHighlighted && !isConnected;
          const color = NODE_COLORS[node.type] || '#888';

          return (
            <div
              key={node.id}
              className={`absolute rounded-lg border cursor-pointer transition-all duration-200 ${
                isHighlighted ? 'z-10 scale-105' : ''
              } ${dimmed ? 'opacity-30' : 'opacity-100'}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: NODE_W,
                height: NODE_H,
                backgroundColor: `${color}18`,
                borderColor: isHighlighted ? color : `${color}60`,
                borderWidth: isHighlighted ? 2 : 1,
              }}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              title={`${node.label}${node.sublabel ? `\n${node.sublabel}` : ''}`}
            >
              <div className="flex items-center justify-center h-full px-2 gap-1.5">
                {node.type === 'agent' ? (
                  <span className="text-base flex-shrink-0">
                    {AGENT_EMOJIS[node.id] || '🤖'}
                  </span>
                ) : (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                    {node.label}
                  </p>
                  {node.sublabel && (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {node.type}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Edge sidebar ─────────────────────────────────────────────────────────────

interface EdgeSidebarProps {
  graph: MemoryGraph;
  highlightedNode: string | null;
  onNodeClick: (id: string) => void;
}

function EdgeSidebar({ graph, highlightedNode, onNodeClick }: EdgeSidebarProps) {
  const edgeTypeGroups = useMemo(() => {
    const groups: Record<string, GraphEdge[]> = {};
    for (const edge of graph.edges) {
      if (!groups[edge.type]) groups[edge.type] = [];
      groups[edge.type].push(edge);
    }
    return groups;
  }, [graph.edges]);

  const visibleTypes = ['a2a_communicates', 'uses', 'depends_on', 'attached_to'].filter(
    t => groups => groups[t]
  );

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {Object.entries(edgeTypeGroups).map(([type, edges]) => {
        const color = EDGE_COLORS[type] || '#888';
        const label = EDGE_LABELS[type] || type;

        return (
          <div key={type}>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color }}
            >
              {label} ({edges.length})
            </h4>
            <div className="space-y-1">
              {edges.map((edge, i) => {
                const isRelated = highlightedNode
                  ? edge.source === highlightedNode || edge.target === highlightedNode
                  : false;
                return (
                  <button
                    key={`${edge.source}-${edge.target}-${i}`}
                    onClick={() => onNodeClick(edge.source)}
                    className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                      isRelated
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex-shrink-0" style={{ color }}>
                      {AGENT_EMOJIS[edge.source] || '●'}
                    </span>
                    <span className="truncate">{edge.source}</span>
                    <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                    <span className="truncate">{edge.target}</span>
                    <span className="flex-shrink-0" style={{ color }}>
                      {AGENT_EMOJIS[edge.target] || '●'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Live Feed ───────────────────────────────────────────────────────────────

function LiveFeed({ messages }: { messages: A2ALiveMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Radio className="w-10 h-10 text-muted-foreground mb-3 animate-pulse" />
        <p className="text-muted-foreground text-sm">
          No live messages yet — A2A interception is not yet wired.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          See <code className="bg-muted px-1 rounded">A2A_CHANNEL_PLUGIN_SPEC.md</code> for the integration plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {messages.map(msg => (
        <div
          key={msg.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
        >
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <span className="text-sm">{AGENT_EMOJIS[msg.from_agent] || '🤖'}</span>
            <span className="text-[10px] text-muted-foreground">→</span>
            <span className="text-sm">{AGENT_EMOJIS[msg.to_agent] || '🤖'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">{msg.from_agent}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-xs font-medium text-foreground">{msg.to_agent}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${EDGE_COLORS.a2a_communicates}20`,
                  color: EDGE_COLORS.a2a_communicates,
                }}
              >
                {msg.message_type}
              </span>
            </div>
            {msg.payload_summary && (
              <p className="text-xs text-muted-foreground truncate">
                {JSON.stringify(msg.payload_summary).slice(0, 80)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(msg.logged_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function A2ACommunication() {
  const [liveMode, setLiveMode] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'edges' | 'nodes'>('edges');

  const { graph, liveMessages, loading, error, lastFetched, refresh } = useGraphData(liveMode);

  const formatLastFetched = (d: Date | null) => {
    if (!d) return '—';
    return d.toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5" />
          A2A Communication
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live mode toggle */}
          <button
            onClick={() => setLiveMode(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              liveMode
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {liveMode ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                Live ({Math.round(POLL_INTERVAL_MS / 1000)}s)
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                Static
              </>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Last updated */}
          <span className="text-xs text-muted-foreground">
            {lastFetched ? `Updated ${formatLastFetched(lastFetched)}` : '—'}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !graph && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading A2A graph…</span>
        </div>
      )}

      {graph && (
        <>
          {/* Meta stats */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{graph.meta.totalNodes}</span> nodes
            </span>
            <span>
              <span className="font-medium text-foreground">{graph.meta.totalEdges}</span> edges
            </span>
            <span>
              Node types:{' '}
              {graph.meta.nodeTypes.map(t => (
                <span key={t} className="inline-flex items-center gap-1 mr-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[t] || '#888' }}
                  />
                  {t}
                </span>
              ))}
            </span>
            <span>
              Edge types:{' '}
              {graph.meta.edgeTypes.map(t => (
                <span key={t} className="inline-flex items-center gap-1 mr-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: EDGE_COLORS[t] || '#888' }}
                  />
                  {EDGE_LABELS[t] || t}
                </span>
              ))}
            </span>
          </div>

          {/* Hover hint */}
          {highlightedNode && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30 text-sm">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-primary">
                Highlighting connections for{' '}
                <strong>{graph.nodes.find(n => n.id === highlightedNode)?.label || highlightedNode}</strong>
              </span>
              <button
                onClick={() => setHighlightedNode(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Main layout: graph + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Graph */}
            <GraphVisualizer
              graph={graph}
              highlightedNode={highlightedNode}
              onNodeHover={setHighlightedNode}
            />

            {/* Sidebar */}
            <div className="space-y-3">
              {/* Tab switcher */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setSidebarTab('edges')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    sidebarTab === 'edges'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Edges ({graph.meta.totalEdges})
                </button>
                <button
                  onClick={() => setSidebarTab('nodes')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-border ${
                    sidebarTab === 'nodes'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Nodes ({graph.meta.totalNodes})
                </button>
              </div>

              {sidebarTab === 'edges' ? (
                <EdgeSidebar
                  graph={graph}
                  highlightedNode={highlightedNode}
                  onNodeClick={setHighlightedNode}
                />
              ) : (
                <div className="space-y-1 max-h-[560px] overflow-y-auto">
                  {graph.nodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => setHighlightedNode(node.id === highlightedNode ? null : node.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                        highlightedNode === node.id
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {node.type === 'agent' ? (
                        <span>{AGENT_EMOJIS[node.id] || '🤖'}</span>
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: NODE_COLORS[node.type] || '#888' }}
                        />
                      )}
                      <span className="flex-1 text-left truncate">{node.label}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{node.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live feed (when live mode is on) */}
          {liveMode && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse text-green-400" />
                Live Message Feed
              </h3>
              <LiveFeed messages={liveMessages} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
