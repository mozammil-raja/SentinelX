'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, GraphNetworkResponse } from '@/lib/api';
import {
  Network,
  ShieldAlert,
  Smartphone,
  Globe,
  CreditCard,
  User as UserIcon,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export function GraphSyndicateVisualizer() {
  const [userId, setUserId] = useState('usr_sarah');
  const [network, setNetwork] = useState<GraphNetworkResponse | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'USER' | 'DEVICE' | 'IP' | 'CARD'>('ALL');

  const fetchGraphData = useCallback(async (targetUser: string) => {
    setLoading(true);
    try {
      const [netData, sumData] = await Promise.all([
        api.graph.getNetwork(targetUser),
        api.graph.getSummary(),
      ]);
      setNetwork(netData);
      setSummary(sumData);
    } catch (err: unknown) {
      console.error('Failed to load graph network:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.graph.getNetwork(userId),
      api.graph.getSummary(),
    ])
      .then(([netData, sumData]) => {
        if (isMounted) {
          setNetwork(netData);
          setSummary(sumData);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) console.error('Failed to load graph network:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filteredNodes = network?.nodes.filter((node) => {
    if (activeFilter === 'ALL') return true;
    return node.type === activeFilter;
  }) || [];

  return (
    <div className="space-y-5 font-mono text-white">
      {/* Header & Global Stats */}
      <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm shadow-rose-500/20">
              <Network className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                  GRAPH_INTELLIGENCE // SYNDICATE_FRAUD_RING_TRAVERSAL
                </h2>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                2-Hop BFS bipartite graph traversal analyzing shared devices, IP subnets, and payment instruments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="SEARCH_ACCOUNT_ID (e.g. usr_sarah)..."
                className="w-full bg-[#151922] border border-slate-700/80 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 font-mono transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-3" />
            </div>
            <button
              onClick={() => fetchGraphData(userId)}
              className="p-2 rounded-lg border border-slate-700/80 bg-[#151922] hover:bg-slate-700 text-neutral-200 transition-colors shadow-sm"
              title="Refresh graph"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Summary Mini-Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">TOTAL_ENTITIES</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-white">{summary?.totalNodes ?? 0}</span>
              <Network className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">USER_NODES</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-sky-400">{summary?.totalUsers ?? 0}</span>
              <UserIcon className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">HARDWARE_FPS</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-purple-400">{summary?.totalDevices ?? 0}</span>
              <Smartphone className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">IP_SUBNETS</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-amber-400">{summary?.totalIps ?? 0}</span>
              <Globe className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 shadow-sm">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">SANCTIONED_NODES</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-rose-400">{summary?.blockedUsersCount ?? 0}</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Syndicate Detection Alert Banner */}
      {network?.syndicateAnalysis?.syndicateDetected ? (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/50 space-y-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>[CRITICAL_SYNDICATE_DETECTED] RULE_07 TRIGGERED (+75 PTS)</span>
          </div>
          <p className="text-neutral-300 font-sans leading-relaxed">
            {network.syndicateAnalysis.explanation}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 font-bold border border-rose-500/40">
              CONNECTED_FRAUDSTER: {network.syndicateAnalysis.connectedBlockedUserId}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#151922] text-neutral-200 border border-slate-700">
              SHARED_INFRASTRUCTURE: {network.syndicateAnalysis.sharedEntityId}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#151922] text-cyan-400 border border-slate-700">
              DEGREES_OF_SEPARATION: {network.syndicateAnalysis.degreesOfSeparation} HOPS
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-400 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>GRAPH_TRAVERSAL_CLEAN: No 2-hop connections to known sanctioned entities detected.</span>
        </div>
      )}

      {/* Interactive 2-Hop SVG Topology Canvas */}
      <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>2-HOP TOPOLOGY NETWORK MAP // VISUAL CLUSTER</span>
          </h3>
          <span className="text-[10px] text-neutral-400">INTERACTIVE BFS BIPARTITE GRAPH</span>
        </div>

        <div className="relative w-full h-72 bg-[#11141a] rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
          {filteredNodes.length === 0 ? (
            <span className="text-xs text-neutral-500">[NO_NODES_IN_CLUSTER]</span>
          ) : (
            <svg className="w-full h-full" viewBox="0 0 800 280">
              {/* Render Edge Links */}
              {network?.edges.map((edge, idx) => {
                const srcIdx = network.nodes.findIndex((n) => n.id === edge.source);
                const tgtIdx = network.nodes.findIndex((n) => n.id === edge.target);
                const total = Math.max(network.nodes.length, 1);

                const srcAngle = ((srcIdx >= 0 ? srcIdx : 0) / total) * Math.PI * 2;
                const tgtAngle = ((tgtIdx >= 0 ? tgtIdx : 1) / total) * Math.PI * 2;

                const isSrcCenter = edge.source.includes(userId);
                const isTgtCenter = edge.target.includes(userId);

                const x1 = isSrcCenter ? 400 : 400 + Math.cos(srcAngle) * 220;
                const y1 = isSrcCenter ? 140 : 140 + Math.sin(srcAngle) * 95;
                const x2 = isTgtCenter ? 400 : 400 + Math.cos(tgtAngle) * 220;
                const y2 = isTgtCenter ? 140 : 140 + Math.sin(tgtAngle) * 95;

                const isHighRiskEdge = network.syndicateAnalysis?.syndicateDetected && 
                  (edge.source.includes(network.syndicateAnalysis.connectedBlockedUserId || 'xyz') || 
                   edge.target.includes(network.syndicateAnalysis.connectedBlockedUserId || 'xyz'));

                return (
                  <g key={`svg-edge-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isHighRiskEdge ? '#f43f5e' : 'rgba(100, 116, 139, 0.4)'}
                      strokeWidth={isHighRiskEdge ? 2.5 : 1.2}
                      strokeDasharray={isHighRiskEdge ? '5 2' : '3 3'}
                    />
                    {/* Edge Label */}
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 4}
                      fill={isHighRiskEdge ? '#f43f5e' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight={isHighRiskEdge ? 'bold' : 'normal'}
                    >
                      {edge.relationship}
                    </text>
                  </g>
                );
              })}

              {/* Render Node Circles */}
              {network?.nodes.map((node, idx) => {
                const total = Math.max(network.nodes.length, 1);
                const angle = (idx / total) * Math.PI * 2;
                const isCenter = node.id.includes(userId);

                const cx = isCenter ? 400 : 400 + Math.cos(angle) * 220;
                const cy = isCenter ? 140 : 140 + Math.sin(angle) * 95;
                const isBlocked = node.isBlocked;

                // Color coding per type
                const nodeColor = isBlocked ? '#f43f5e' :
                  node.type === 'USER' ? '#38bdf8' :
                  node.type === 'DEVICE' ? '#c084fc' :
                  node.type === 'IP' ? '#fbbf24' : '#34d399';

                return (
                  <g key={`svg-node-${node.id}`} className="cursor-pointer">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isCenter ? 22 : 15}
                      fill={nodeColor}
                      stroke="#0f172a"
                      strokeWidth={isCenter ? 3 : 2}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      fill="#000000"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {node.type.slice(0, 3)}
                    </text>
                    <text
                      x={cx}
                      y={cy + (isCenter ? 34 : 26)}
                      fill={nodeColor}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Node-Link Network Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Node Explorer */}
        <div className="lg:col-span-2 bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>CONNECTED_SUBGRAPH_NODES ({filteredNodes.length})</span>
            </h3>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#151922] p-1 rounded-lg border border-slate-800 text-[10px]">
              {(['ALL', 'USER', 'DEVICE', 'IP', 'CARD'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    activeFilter === filter
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const isBlocked = node.isBlocked;
              const isFocus = node.id.includes(userId);

              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isBlocked
                      ? 'bg-rose-950/30 border-rose-500/60 text-white'
                      : isFocus
                      ? 'bg-[#151922] border-cyan-500/60 text-white font-bold ring-1 ring-cyan-500/30'
                      : 'bg-[#151922] border-slate-800/80 text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${
                      node.type === 'USER' ? 'border-sky-400/40 bg-sky-950/60 text-sky-400' :
                      node.type === 'DEVICE' ? 'border-purple-400/40 bg-purple-950/60 text-purple-400' :
                      node.type === 'IP' ? 'border-amber-400/40 bg-amber-950/60 text-amber-400' :
                      'border-emerald-400/40 bg-emerald-950/60 text-emerald-400'
                    }`}>
                      {node.type === 'USER' && <UserIcon className="w-3.5 h-3.5" />}
                      {node.type === 'DEVICE' && <Smartphone className="w-3.5 h-3.5" />}
                      {node.type === 'IP' && <Globe className="w-3.5 h-3.5" />}
                      {node.type === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{node.label}</div>
                      <div className={`text-[10px] uppercase ${isBlocked ? 'text-rose-400 font-bold' : 'text-neutral-400'}`}>{node.type} NODE</div>
                    </div>
                  </div>

                  {isBlocked ? (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-[10px] font-bold text-rose-300 border border-rose-600/50 shrink-0">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                      SCORE: {node.riskScore || 0}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Relationship Links Matrix */}
        <div className="bg-[#1c222e] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>OBSERVED_EDGES ({network?.edges.length || 0})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {network?.edges.map((edge, idx) => (
              <div
                key={`${edge.source}-${edge.target}-${idx}`}
                className="p-3 rounded-xl bg-[#151922] border border-slate-800/80 space-y-1 text-xs text-white shadow-sm"
              >
                <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                  <span className="text-cyan-400 font-bold">{edge.relationship}</span>
                  <span>WEIGHT: {edge.weight}</span>
                </div>
                <div className="text-neutral-300 truncate text-[11px] font-mono">
                  <span className="text-white font-semibold">{edge.source}</span>
                  <span className="text-neutral-500 mx-1.5">──►</span>
                  <span className="text-white">{edge.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
