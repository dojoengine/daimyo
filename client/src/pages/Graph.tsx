import { useEffect, useRef, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { formatJamTitle } from '../utils/jam';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import './Graph.css';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  emoji: string;
  title: string;
  weight: number;
  inWeight: number;
  outWeight: number;
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  weight: number;
}

interface ApiNode {
  id: string;
  emoji: string;
  title: string;
  weight: number;
}

interface ApiEdge {
  source: string;
  target: string;
  weight: number;
}

function radius(weight: number, maxWeight: number): number {
  const t = Math.sqrt(weight / Math.max(maxWeight, 1));
  return 18 + t * 32; // 18–50
}

function edgeWidth(w: number, maxW: number): number {
  return 0.5 + (w / Math.max(maxW, 0.01)) * 2;
}

function edgeOpacity(w: number, maxW: number): number {
  return 0.15 + (w / Math.max(maxW, 0.01)) * 0.35;
}

export default function Graph() {
  const { slug } = useParams<{ slug: string }>();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [maxWeight, setMaxWeight] = useState(1);
  const [maxEdgeWeight, setMaxEdgeWeight] = useState(0.01);
  const [, setTick] = useState(0); // force re-renders on simulation tick
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/jams/${slug}/graph`)
      .then((r) => {
        if (r.status === 423) { setLocked(true); return null; }
        if (!r.ok) throw new Error('Failed to load graph data');
        return r.json();
      })
      .then((data: { nodes: ApiNode[]; edges: ApiEdge[] } | null) => {
        if (!data) return;
        const inW = new Map<string, number>();
        const outW = new Map<string, number>();
        for (const e of data.edges) {
          outW.set(e.source, (outW.get(e.source) ?? 0) + e.weight);
          inW.set(e.target, (inW.get(e.target) ?? 0) + e.weight);
        }

        const graphNodes: GraphNode[] = data.nodes.map((n) => ({
          ...n,
          inWeight: inW.get(n.id) ?? 0,
          outWeight: outW.get(n.id) ?? 0,
        }));

        const graphEdges: GraphEdge[] = data.edges.map((e) => ({
          source: e.source,
          target: e.target,
          weight: e.weight,
        }));

        setMaxWeight(Math.max(...graphNodes.map((n) => n.weight), 1));
        setMaxEdgeWeight(Math.max(...graphEdges.map((e) => e.weight), 0.01));
        setNodes(graphNodes);
        setEdges(graphEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Run simulation
  useEffect(() => {
    if (nodes.length === 0 || !wrapRef.current) return;

    const width = wrapRef.current.clientWidth;
    const height = width;
    const mw = Math.max(...nodes.map((n) => n.weight), 1);

    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(300)
      )
      .force('charge', forceManyBody().strength(-800))
      .force('center', forceCenter(width / 2, height / 2))
      .force(
        'collision',
        forceCollide<GraphNode>().radius((d) => radius(d.weight, mw) + 30)
      )
      .on('tick', () => setTick((t) => t + 1));

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, edges]);

  const toggleSelected = (id: string) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const width = wrapRef.current?.clientWidth ?? 900;
  const height = width;

  if (!loading && locked) {
    return <Navigate to="/jam" replace />;
  }

  return (
    <div className="graph-page">
      <div className="graph-container">
        <div className="graph-hero">
          <span className="graph-hero-kanji">関 係</span>
          <h1 className="graph-title">{formatJamTitle(slug ?? '')}</h1>
          <div className="graph-divider" />
        </div>

        {loading && <div className="graph-loading">Loading...</div>}
        {error && <div className="graph-error">{error}</div>}

        <div className="graph-svg-wrap" ref={wrapRef}>
          <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 -5 10 10"
                refX={10}
                refY={0}
                markerWidth={6}
                markerHeight={6}
                orient="auto"
              >
                <path d="M0,-5L10,0L0,5" fill="#ff1a3d" />
              </marker>
              <marker
                id="arrowhead-dim"
                viewBox="0 -5 10 10"
                refX={10}
                refY={0}
                markerWidth={6}
                markerHeight={6}
                orient="auto"
              >
                <path d="M0,-5L10,0L0,5" fill="#ff1a3d" fillOpacity={0.03} />
              </marker>
            </defs>

            {/* Edges */}
            <g>
              {edges.map((e, i) => {
                const s = e.source as GraphNode;
                const t = e.target as GraphNode;
                if (s.x == null || t.x == null) return null;
                const dx = t.x! - s.x!;
                const dy = t.y! - s.y!;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const sr = radius(s.weight, maxWeight);
                const tr = radius(t.weight, maxWeight);
                const connected = hoveredNode
                  ? s.id === hoveredNode || t.id === hoveredNode
                  : selectedNodes.size > 0
                    ? selectedNodes.has(s.id) && selectedNodes.has(t.id)
                    : true;
                const opacity = connected
                  ? edgeOpacity(e.weight, maxEdgeWeight)
                  : 0.03;
                return (
                  <line
                    key={i}
                    x1={s.x! + (dx / dist) * sr}
                    y1={s.y! + (dy / dist) * sr}
                    x2={t.x! - (dx / dist) * tr}
                    y2={t.y! - (dy / dist) * tr}
                    stroke="#ff1a3d"
                    strokeWidth={edgeWidth(e.weight, maxEdgeWeight)}
                    strokeOpacity={opacity}
                    markerEnd={connected ? 'url(#arrowhead)' : 'url(#arrowhead-dim)'}
                    style={{ transition: 'stroke-opacity 0.2s ease' }}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {nodes.map((n) => {
                if (n.x == null) return null;
                const r = radius(n.weight, maxWeight);
                const showStats = hoveredNode
                  ? n.id === hoveredNode || selectedNodes.has(n.id)
                  : selectedNodes.has(n.id);
                let inW = 0;
                let outW = 0;
                if (showStats) {
                  if (hoveredNode) {
                    for (const e of edges) {
                      const s = e.source as GraphNode;
                      const t = e.target as GraphNode;
                      if (s.id !== hoveredNode && t.id !== hoveredNode) continue;
                      if (t.id === n.id) inW += e.weight;
                      if (s.id === n.id) outW += e.weight;
                    }
                  } else if (selectedNodes.size > 0) {
                    for (const e of edges) {
                      const s = e.source as GraphNode;
                      const t = e.target as GraphNode;
                      if (!selectedNodes.has(s.id) || !selectedNodes.has(t.id)) continue;
                      if (t.id === n.id) inW += e.weight;
                      if (s.id === n.id) outW += e.weight;
                    }
                  } else {
                    inW = n.inWeight;
                    outW = n.outWeight;
                  }
                }
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredNode(n.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => toggleSelected(n.id)}
                  >
                    <circle
                      r={r}
                      fill="#141420"
                      stroke={selectedNodes.has(n.id) ? '#4ade80' : '#c9a84c'}
                      strokeWidth={selectedNodes.has(n.id) ? 2.5 : 1.5}
                    />
                    <text
                      className="graph-node-emoji"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={Math.max(14, r * 0.6)}
                    >
                      {n.emoji}
                    </text>
                    <text className="graph-node-title" textAnchor="middle" dy={r + 14}>
                      {n.title} <tspan className="graph-node-weight">({n.weight.toFixed(2)})</tspan>
                    </text>
                    {(inW > 0 || outW > 0) && (
                      <text className="graph-node-stats" textAnchor="middle" dy={r + 28}>
                        <tspan fill="#4ade80">in {inW.toFixed(2)}</tspan>
                        <tspan fill="#787892"> · </tspan>
                        <tspan fill="#ff1a3d">out {outW.toFixed(2)}</tspan>
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="graph-legend">
          <span className="graph-legend-item">
            <span className="graph-legend-arrow">→</span> Edge direction = preference (loser → winner)
          </span>
          <span className="graph-legend-item">
            Node size = ranking weight
          </span>
          <span className="graph-legend-item">
            <span className="graph-legend-in">in</span> = total incoming preference &nbsp;
            <span className="graph-legend-out">out</span> = total outgoing preference
          </span>
        </div>

        <Link to={`/jam/${slug}/results`} className="graph-back">← Results</Link>
      </div>
    </div>
  );
}
