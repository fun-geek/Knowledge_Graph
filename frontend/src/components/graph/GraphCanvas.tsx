import React, { useEffect, useRef, useState, useCallback } from "react";
import { Edge, Node, NodeType, SubgraphData } from "../../types";
import { NODE_COLORS } from "../../utils/colors";
import { ZoomIn, ZoomOut, RotateCcw, Filter, Eye, Search, Layers } from "lucide-react";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId?: string | null;
  onSelectNode?: (node: Node | null) => void;
  activeSubgraph?: SubgraphData | null;
  highlightSeedIds?: string[];
  highlightHop1Ids?: string[];
  highlightHop2Ids?: string[];
  height?: string;
  showControls?: boolean;
}

interface SimNode {
  id: string;
  name: string;
  type: NodeType;
  raw: Node;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  isDragging?: boolean;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  activeSubgraph,
  highlightSeedIds = [],
  highlightHop1Ids = [],
  highlightHop2Ids = [],
  height = "h-[650px]",
  showControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  // Camera transform: pan (x, y) and zoom scale
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Filter toggles
  const [filterTypes, setFilterTypes] = useState<Record<NodeType, boolean>>({
    member: true,
    event: true,
    domain: true,
    project: true,
    policy: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  // Simulation state
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const edgesRef = useRef<Edge[]>(edges);
  const animFrameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const particleOffsetRef = useRef<number>(0);

  // Drag interaction
  const dragNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  edgesRef.current = edges;

  // Initialize or update simulation nodes
  useEffect(() => {
    const map = simNodesRef.current;
    const width = 1000;
    const height = 700;

    nodes.forEach((n, idx) => {
      if (!map.has(n.id)) {
        // Deterministic initial circular scatter by type
        const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
        const dist = 180 + (idx % 4) * 70;
        const radius = n.type === "policy" ? 22 : n.type === "domain" ? 24 : n.type === "member" ? 20 : 16;

        map.set(n.id, {
          id: n.id,
          name: n.name,
          type: n.type,
          raw: n,
          x: width / 2 + Math.cos(angle) * dist,
          y: height / 2 + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius,
          phase: Math.random() * Math.PI * 2,
        });
      } else {
        const existing = map.get(n.id)!;
        existing.raw = n;
        existing.name = n.name;
        existing.type = n.type;
      }
    });

    // Remove deleted nodes
    const currentIds = new Set(nodes.map((n) => n.id));
    for (const id of map.keys()) {
      if (!currentIds.has(id)) {
        map.delete(id);
      }
    }
  }, [nodes]);

  // Center camera on mount or resize
  const centerGraph = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    transformRef.current = {
      x: canvas.width / 2 - 500,
      y: canvas.height / 2 - 350,
      k: 0.85,
    };
    setZoomLevel(0.85);
  }, []);

  useEffect(() => {
    centerGraph();
  }, [centerGraph]);

  // Physics & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      particleOffsetRef.current = (particleOffsetRef.current + dt * 45) % 1000;

      const simNodes = Array.from(simNodesRef.current.values()).filter(
        (sn) => filterTypes[sn.type]
      );
      const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

      // 1. Force Simulation Step
      const centerX = 500;
      const centerY = 350;

      // Repulsion between visible nodes
      for (let i = 0; i < simNodes.length; i++) {
        const n1 = simNodes[i];
        if (n1.isDragging) continue;

        // Gravity toward center
        n1.vx += (centerX - n1.x) * 0.015;
        n1.vy += (centerY - n1.y) * 0.015;

        // Harmonic breathing / floating movement
        const floatX = Math.cos(now * 0.0015 + n1.phase) * 0.4;
        const floatY = Math.sin(now * 0.0018 + n1.phase) * 0.4;
        n1.vx += floatX;
        n1.vy += floatY;

        for (let j = i + 1; j < simNodes.length; j++) {
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 320) {
            const force = (320 - dist) / dist * 0.7;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            if (!n2.isDragging) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // Spring attraction along edges
      edgesRef.current.forEach((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 110;
          const springForce = (dist - targetDist) * 0.008;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (!s.isDragging) {
            s.vx += fx;
            s.vy += fy;
          }
          if (!t.isDragging) {
            t.vx -= fx;
            t.vy -= fy;
          }
        }
      });

      // Update positions with friction damping
      simNodes.forEach((n) => {
        if (!n.isDragging) {
          n.vx *= 0.86;
          n.vy *= 0.86;
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      // 2. Render Canvas
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid dots
      const { x: tx, y: ty, k } = transformRef.current;
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      // Draw subtle grid
      ctx.strokeStyle = "rgba(42, 38, 56, 0.4)";
      ctx.lineWidth = 0.5 / k;
      const gridSize = 60;
      const startX = -tx / k - 100;
      const endX = (canvas.width - tx) / k + 100;
      const startY = -ty / k - 100;
      const endY = (canvas.height - ty) / k + 100;

      ctx.beginPath();
      for (let gx = Math.floor(startX / gridSize) * gridSize; gx < endX; gx += gridSize) {
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, endY);
      }
      for (let gy = Math.floor(startY / gridSize) * gridSize; gy < endY; gy += gridSize) {
        ctx.moveTo(startX, gy);
        ctx.lineTo(endX, gy);
      }
      ctx.stroke();

      // Determine active / highlighted sets
      const hasActiveQuery = Boolean(
        activeSubgraph || highlightSeedIds.length || highlightHop1Ids.length || highlightHop2Ids.length
      );
      const seedSet = new Set(highlightSeedIds);
      const hop1Set = new Set(highlightHop1Ids);
      const hop2Set = new Set(highlightHop2Ids);
      const activeSubgraphNodeIds = new Set(activeSubgraph?.nodes.map((n) => n.id) || []);

      // Draw Edges
      edgesRef.current.forEach((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) return;

        // Is this edge part of active traversal?
        const isTraversalEdge =
          (seedSet.has(s.id) && hop1Set.has(t.id)) ||
          (hop1Set.has(s.id) && hop2Set.has(t.id)) ||
          (activeSubgraphNodeIds.has(s.id) && activeSubgraphNodeIds.has(t.id));

        let edgeAlpha = 0.15;
        let edgeColor = "#2A2638";
        let edgeWidth = 1;

        if (hasActiveQuery) {
          if (isTraversalEdge) {
            edgeAlpha = 0.9;
            edgeColor = "#2B3AF3";
            edgeWidth = 2.5;
          } else {
            edgeAlpha = 0.04;
          }
        } else if (selectedNodeId && (s.id === selectedNodeId || t.id === selectedNodeId)) {
          edgeAlpha = 0.8;
          edgeColor = "#6F2982";
          edgeWidth = 2;
        }

        ctx.strokeStyle = edgeColor;
        ctx.globalAlpha = edgeAlpha;
        ctx.lineWidth = edgeWidth;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        // Directional particle animation on active traversal edges
        if (isTraversalEdge) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const tPos = ((particleOffsetRef.current * 0.8) % len) / len;
          const px = s.x + dx * tPos;
          const py = s.y + dy * tPos;

          ctx.fillStyle = "#FF7071";
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Nodes
      simNodes.forEach((n) => {
        const isSelected = selectedNodeId === n.id;
        const isSeed = seedSet.has(n.id);
        const isHop1 = hop1Set.has(n.id);
        const isHop2 = hop2Set.has(n.id);
        const isInSubgraph = activeSubgraphNodeIds.has(n.id);

        let alpha = 1.0;
        if (hasActiveQuery) {
          if (isSeed || isHop1 || isHop2 || isInSubgraph) {
            alpha = 1.0;
          } else {
            alpha = 0.18; // Fade irrelevant nodes
          }
        }

        ctx.globalAlpha = alpha;
        const baseColor = NODE_COLORS[n.type];

        // Seed pulsing glow ring
        if (isSeed) {
          const pulse = (Math.sin(now * 0.006) + 1) * 0.5;
          ctx.strokeStyle = "#FF7071";
          ctx.lineWidth = 3 + pulse * 4;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6 + pulse * 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isHop1) {
          ctx.strokeStyle = "#2B3AF3";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isHop2) {
          ctx.strokeStyle = "#6F2982";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Main node body
        ctx.fillStyle = "#14131D";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = baseColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Node ID or Type Letter in center
        ctx.fillStyle = baseColor;
        ctx.font = `600 ${Math.max(9, Math.round(n.radius * 0.65))}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const shortCode = n.id.length <= 5 ? n.id : n.type.charAt(0).toUpperCase();
        ctx.fillText(shortCode, n.x, n.y);

        // Label under node
        ctx.fillStyle = isSelected ? "#FFFFFF" : "#F5F3F7";
        ctx.font = `500 ${Math.max(10, Math.round(11 / Math.sqrt(k)))}px "Inter", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const displayName = n.name.length > 22 ? n.name.slice(0, 20) + "…" : n.name;
        ctx.fillText(displayName, n.x, n.y + n.radius + 4);
      });

      ctx.restore();

      // 3. Render Minimap
      renderMinimap();

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [filterTypes, selectedNodeId, activeSubgraph, highlightSeedIds, highlightHop1Ids, highlightHop2Ids]);

  // Minimap rendering helper
  const renderMinimap = () => {
    const mini = minimapRef.current;
    const canvas = canvasRef.current;
    if (!mini || !canvas) return;
    const mctx = mini.getContext("2d");
    if (!mctx) return;

    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.fillStyle = "rgba(11, 11, 18, 0.9)";
    mctx.fillRect(0, 0, mini.width, mini.height);

    const simNodes = Array.from(simNodesRef.current.values()).filter(
      (sn) => filterTypes[sn.type]
    );

    // Compute bounding box
    let minX = 0,
      maxX = 1000,
      minY = 0,
      maxY = 700;
    simNodes.forEach((n) => {
      minX = Math.min(minX, n.x - 50);
      maxX = Math.max(maxX, n.x + 50);
      minY = Math.min(minY, n.y - 50);
      maxY = Math.max(maxY, n.y + 50);
    });

    const scaleX = mini.width / (maxX - minX || 1);
    const scaleY = mini.height / (maxY - minY || 1);
    const mScale = Math.min(scaleX, scaleY) * 0.9;

    mctx.save();
    mctx.translate(mini.width / 2, mini.height / 2);
    mctx.scale(mScale, mScale);
    mctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

    // Draw nodes on minimap
    simNodes.forEach((n) => {
      mctx.fillStyle = NODE_COLORS[n.type];
      mctx.beginPath();
      mctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      mctx.fill();
    });

    // Draw viewport rectangle on minimap
    const { x: tx, y: ty, k } = transformRef.current;
    const vpX = -tx / k;
    const vpY = -ty / k;
    const vpW = canvas.width / k;
    const vpH = canvas.height / k;

    mctx.strokeStyle = "rgba(111, 41, 130, 0.9)";
    mctx.lineWidth = 2 / mScale;
    mctx.strokeRect(vpX, vpY, vpW, vpH);

    mctx.restore();
  };

  // Mouse / Pointer event handlers for Pan & Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { x: tx, y: ty, k } = transformRef.current;
    const worldX = (clientX - tx) / k;
    const worldY = (clientY - ty) / k;

    // Check hit node
    const simNodes = Array.from(simNodesRef.current.values()).filter(
      (sn) => filterTypes[sn.type]
    );

    let hitNode: SimNode | null = null;
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 4) {
        hitNode = n;
        break;
      }
    }

    if (hitNode) {
      dragNodeRef.current = hitNode;
      hitNode.isDragging = true;
      if (onSelectNode) onSelectNode(hitNode.raw);
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: clientX - tx, y: clientY - ty };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { x: tx, y: ty, k } = transformRef.current;

    if (dragNodeRef.current) {
      dragNodeRef.current.x = (clientX - tx) / k;
      dragNodeRef.current.y = (clientY - ty) / k;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
      return;
    }

    if (isPanningRef.current) {
      transformRef.current.x = clientX - panStartRef.current.x;
      transformRef.current.y = clientY - panStartRef.current.y;
      return;
    }

    // Hover detection
    const worldX = (clientX - tx) / k;
    const worldY = (clientY - ty) / k;
    const simNodes = Array.from(simNodesRef.current.values()).filter(
      (sn) => filterTypes[sn.type]
    );

    let hovered: SimNode | null = null;
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 4) {
        hovered = n;
        break;
      }
    }
    setHoveredNode(hovered);
  };

  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.isDragging = false;
      dragNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const { x: tx, y: ty, k } = transformRef.current;
    const newK = Math.min(Math.max(k * zoomFactor, 0.25), 3.5);

    // Zoom centered around mouse
    transformRef.current = {
      x: mouseX - (mouseX - tx) * (newK / k),
      y: mouseY - (mouseY - ty) * (newK / k),
      k: newK,
    };
    setZoomLevel(newK);
  };

  const zoomIn = () => {
    const newK = Math.min(transformRef.current.k * 1.25, 3.5);
    transformRef.current.k = newK;
    setZoomLevel(newK);
  };

  const zoomOut = () => {
    const newK = Math.max(transformRef.current.k * 0.8, 0.25);
    transformRef.current.k = newK;
    setZoomLevel(newK);
  };

  // Search and focus node
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();

    const target = Array.from(simNodesRef.current.values()).find(
      (n) => n.id.toLowerCase() === q || n.name.toLowerCase().includes(q)
    );

    if (target && canvasRef.current) {
      const canvas = canvasRef.current;
      transformRef.current = {
        x: canvas.width / 2 - target.x * 1.3,
        y: canvas.height / 2 - target.y * 1.3,
        k: 1.3,
      };
      setZoomLevel(1.3);
      if (onSelectNode) onSelectNode(target.raw);
    }
  };

  return (
    <div className={`relative w-full ${height} bg-[#0B0B12] rounded-xl border border-borderDark overflow-hidden select-none`}>
      {/* Search & Filter Toolbar */}
      {showControls && (
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-[#14131D]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-borderDark shadow-xl">
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 bg-[#0B0B12] px-2.5 py-1 rounded border border-borderDark">
            <Search className="w-3.5 h-3.5 text-textMuted" />
            <input
              type="text"
              placeholder="Find entity (e.g. M003, GPU, AI/ML)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-textMain placeholder-textMuted focus:outline-none w-48 font-mono"
            />
          </form>

          <div className="h-4 w-[1px] bg-borderDark" />

          {/* Node Type Toggles */}
          <div className="flex items-center gap-1.5">
            {(["member", "event", "domain", "project", "policy"] as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
                  filterTypes[type]
                    ? "border-opacity-60 bg-[#1C1A28]"
                    : "border-transparent text-textMuted opacity-40 hover:opacity-75"
                }`}
                style={{
                  borderColor: filterTypes[type] ? NODE_COLORS[type] : "transparent",
                  color: filterTypes[type] ? NODE_COLORS[type] : undefined,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Canvas */}
      <canvas
        ref={canvasRef}
        width={1400}
        height={850}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Hover Info Pill */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-[#14131D]/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-borderDark shadow-2xl max-w-sm pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
              style={{ backgroundColor: `${NODE_COLORS[hoveredNode.type]}22`, color: NODE_COLORS[hoveredNode.type] }}
            >
              {hoveredNode.type}
            </span>
            <span className="font-mono text-xs text-textMuted">{hoveredNode.id}</span>
          </div>
          <p className="font-semibold text-sm text-textMain">{hoveredNode.name}</p>
          {hoveredNode.raw.properties.role && (
            <p className="text-xs text-textMuted mt-0.5">{hoveredNode.raw.properties.role}</p>
          )}
          {hoveredNode.raw.properties.summary && (
            <p className="text-xs text-textMuted mt-1 line-clamp-2">{hoveredNode.raw.properties.summary}</p>
          )}
        </div>
      )}

      {/* Camera Controls */}
      {showControls && (
        <div className="absolute bottom-4 right-44 z-10 flex items-center gap-1.5 bg-[#14131D]/90 backdrop-blur-md p-1.5 rounded-lg border border-borderDark shadow-lg">
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-[#1C1A28] text-textMuted hover:text-textMain transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-[#1C1A28] text-textMuted hover:text-textMain transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={centerGraph}
            className="p-1.5 rounded hover:bg-[#1C1A28] text-textMuted hover:text-textMain transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-textMuted px-1">{Math.round(zoomLevel * 100)}%</span>
        </div>
      )}

      {/* Minimap radar overview */}
      <div className="absolute bottom-4 right-4 z-10 rounded-lg border border-borderDark overflow-hidden shadow-2xl bg-[#0B0B12]/80 backdrop-blur-md">
        <canvas ref={minimapRef} width={140} height={90} className="block" />
        <div className="text-[9px] font-mono text-center text-textMuted py-0.5 bg-[#14131D]/90 border-t border-borderDark">
          RADAR MINIMAP
        </div>
      </div>
    </div>
  );
};
