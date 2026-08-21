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
    } catch (err) {
      console.error('Failed to load graph network:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [netData, sumData] = await Promise.all([
          api.graph.getNetwork(userId),
          api.graph.getSummary(),
        ]);
        if (!ignore) {
          setNetwork(netData);
          setSummary(sumData);
        }
      } catch (err) {
        if (!ignore) console.error('Failed to load graph network:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const filteredNodes = network?.nodes.filter((node) => {
    if (activeFilter === 'ALL') return true;
    return node.type === activeFilter;
  }) || [];

  return (
    <div className="space-y-4 font-mono text-white">
      {/* Header & Global Stats */}
      <div className="bg-[#353535] border border-white rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
              <Network className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  GRAPH_INTELLIGENCE // SYNDICATE_FRAUD_RING_TRAVERSAL
                </h2>
              </div>
              <p className="text-xs text-neutral-300 font-sans mt-0.5">
                2-Hop BFS bipartite graph traversal analyzing shared devices, IP subnets, and payment instruments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="SEARCH_ACCOUNT_ID (e.g. usr_sarah)..."
                className="w-full bg-[#353535] border border-white rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-white font-mono"
              />
              <Search className="w-3.5 h-3.5 text-neutral-300 absolute left-2.5 top-2.5" />
            </div>
            <button
              onClick={() => fetchGraphData(userId)}
              className="p-1.5 rounded border border-white bg-white text-black hover:bg-neutral-200 transition-colors font-bold"
              title="Refresh graph"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Summary Mini-Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded bg-[#353535] border border-white">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">TOTAL_ENTITIES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-white">{summary?.totalNodes ?? 0}</span>
              <Network className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#353535] border border-white">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">USER_NODES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-white">{summary?.totalUsers ?? 0}</span>
              <UserIcon className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#353535] border border-white">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">HARDWARE_FPS</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-white">{summary?.totalDevices ?? 0}</span>
              <Smartphone className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#353535] border border-white">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">IP_SUBNETS</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-white">{summary?.totalIps ?? 0}</span>
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#353535] border border-white">
            <span className="text-[10px] text-neutral-300 uppercase tracking-wider">SANCTIONED_NODES</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-lg font-bold text-white">{summary?.blockedUsersCount ?? 0}</span>
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Syndicate Detection Alert Banner */}
      {network?.syndicateAnalysis?.syndicateDetected ? (
        <div className="p-3.5 rounded bg-[#353535] border border-white space-y-2 text-xs">
          <div className="flex items-center gap-2 text-white font-bold">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>[CRITICAL_SYNDICATE_DETECTED] RULE_07 TRIGGERED (+75 PTS)</span>
          </div>
          <p className="text-neutral-200 font-sans leading-relaxed">
            {network.syndicateAnalysis.explanation}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white text-black font-bold border border-white">
              CONNECTED_FRAUDSTER: {network.syndicateAnalysis.connectedBlockedUserId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#353535] text-white border border-white">
              SHARED_INFRASTRUCTURE: {network.syndicateAnalysis.sharedEntityId}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#353535] text-white border border-white">
              DEGREES_OF_SEPARATION: {network.syndicateAnalysis.degreesOfSeparation} HOPS
            </span>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded bg-[#353535] border border-white flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>GRAPH_TRAVERSAL_CLEAN: No 2-hop connections to known sanctioned entities detected.</span>
        </div>
      )}

      {/* Node-Link Network Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Node Explorer */}
        <div className="lg:col-span-2 bg-[#353535] border border-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-white">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-white" />
              <span>CONNECTED_SUBGRAPH_NODES ({filteredNodes.length})</span>
            </h3>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#353535] p-0.5 rounded border border-white text-[10px]">
              {(['ALL', 'USER', 'DEVICE', 'IP', 'CARD'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    activeFilter === filter
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const isBlocked = node.isBlocked;
              const isFocus = node.id.includes(userId);

              return (
                <div
                  key={node.id}
                  className={`p-2.5 rounded border flex items-center justify-between gap-2 transition-colors ${
                    isBlocked
                      ? 'bg-white text-black font-bold border-white'
                      : isFocus
                      ? 'bg-white/20 border-white text-white font-bold'
                      : 'bg-[#353535] border-white text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded bg-[#353535] border border-white text-white shrink-0">
                      {node.type === 'USER' && <UserIcon className="w-3.5 h-3.5" />}
                      {node.type === 'DEVICE' && <Smartphone className="w-3.5 h-3.5" />}
                      {node.type === 'IP' && <Globe className="w-3.5 h-3.5" />}
                      {node.type === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{node.label}</div>
                      <div className={`text-[10px] uppercase ${isBlocked ? 'text-neutral-700 font-normal' : 'text-neutral-300'}`}>{node.type} NODE</div>
                    </div>
                  </div>

                  {isBlocked ? (
                    <span className="px-1.5 py-0.2 rounded bg-black text-[10px] font-bold text-white border border-black shrink-0">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-300 shrink-0">
                      SCORE: {node.riskScore || 0}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Relationship Links Matrix */}
        <div className="bg-[#353535] border border-white rounded-lg p-4 space-y-3">
          <div className="pb-1 border-b border-white">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>OBSERVED_EDGES ({network?.edges.length || 0})</span>
            </h3>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {network?.edges.map((edge, idx) => (
              <div
                key={`${edge.source}-${edge.target}-${idx}`}
                className="p-2 rounded bg-[#353535] border border-white space-y-1 text-xs text-white"
              >
                <div className="flex items-center justify-between text-[10px] text-neutral-300 uppercase tracking-wider">
                  <span className="text-white font-bold">{edge.relationship}</span>
                  <span>WEIGHT: {edge.weight}</span>
                </div>
                <div className="text-neutral-200 truncate text-[11px]">
                  <span className="text-white font-semibold">{edge.source}</span>
                  <span className="text-neutral-400 mx-1.5">──►</span>
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
