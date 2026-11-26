'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDecisionStream } from '@/hooks/useDecisionStream';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthModal } from '@/components/AuthModal';
import { TransactionSimulator } from '@/components/TransactionSimulator';
import { LiveTransactionFeed } from '@/components/LiveTransactionFeed';
import { RulesManager } from '@/components/RulesManager';
import { ReviewQueuePanel } from '@/components/ReviewQueuePanel';
import { VelocityTelemetryCard } from '@/components/VelocityTelemetryCard';
import { BacktestStudio } from '@/components/BacktestStudio';
import { GraphSyndicateVisualizer } from '@/components/GraphSyndicateVisualizer';
import { TransactionLedger } from '@/components/TransactionLedger';
import {
  Shield,
  Activity,
  SlidersHorizontal,
  ClipboardList,
  Gauge,
  FlaskConical,
  Network,
  Database,
  LogIn,
  LogOut,
  Terminal,
  Command,
  Search,
  X,
  Zap,
  RotateCcw,
} from 'lucide-react';

type Tab = 'stream' | 'rules' | 'reviews' | 'velocity' | 'backtest' | 'graph' | 'ledger';

function DashboardContent() {
  const { status, decisions, lastPing, clearDecisions } = useDecisionStream();
  const { user, isAuthenticated, logout, openAuthModal, loginAsDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['stream', 'rules', 'reviews', 'velocity', 'backtest', 'graph', 'ledger'].includes(hash)) {
        return hash;
      }
    }
    return 'stream';
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  // Subscribe to window hashchange events
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['stream', 'rules', 'reviews', 'velocity', 'backtest', 'graph', 'ledger'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  // Global Keyboard Shortcuts (1-6, Ctrl+K, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') setIsCommandOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        return;
      }

      if (e.key === '1') handleTabChange('stream');
      else if (e.key === '2') handleTabChange('rules');
      else if (e.key === '3') handleTabChange('reviews');
      else if (e.key === '4') handleTabChange('velocity');
      else if (e.key === '5') handleTabChange('backtest');
      else if (e.key === '6') handleTabChange('graph');
      else if (e.key === '7') handleTabChange('ledger');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real Latency History Sparkline computed from live evaluated transactions
  const sparklinePoints = useMemo(() => {
    if (decisions.length === 0) return '';
    const latencies = decisions.slice(0, 10).map((d) => d.evaluationTimeMs || 0).reverse();
    if (latencies.length < 2) return '';
    
    const min = Math.min(...latencies, 0);
    const max = Math.max(...latencies, 20);
    const width = 60;
    const height = 14;
    
    return latencies.map((val, idx) => {
      const x = (idx / (latencies.length - 1)) * width;
      const y = height - ((val - min) / Math.max(max - min, 1)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [decisions]);

  const allowCount = useMemo(() => decisions.filter((d) => d.decision === 'ALLOW').length, [decisions]);
  const reviewCount = useMemo(() => decisions.filter((d) => d.decision === 'REVIEW').length, [decisions]);
  const blockCount = useMemo(() => decisions.filter((d) => d.decision === 'BLOCK').length, [decisions]);
  const avgLatency = useMemo(() => {
    if (decisions.length === 0) return 0;
    return Math.round(decisions.reduce((acc, d) => acc + (d.evaluationTimeMs || 0), 0) / decisions.length);
  }, [decisions]);

  return (
    <div className="min-h-screen bg-[#11141a] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-[#151922] sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/20">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-bold text-sm tracking-wider uppercase text-white leading-none">
                  SENTINELX
                </span>
                <span className="text-[10px] font-mono text-neutral-400 leading-tight">
                  Decision Kernel v1.0
                </span>
              </div>
            </div>

            {/* Stream Telemetry */}
            <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">STREAM</span>
                <span className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-white font-bold">{status}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">LATENCY:</span>
                <span className="text-emerald-400 font-bold">{decisions.length > 0 ? `${avgLatency} ms` : 'STANDBY'}</span>
                <svg className="w-14 h-3.5 overflow-visible" viewBox="0 0 60 14">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparklinePoints}
                  />
                </svg>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">DECISIONS:</span>
                <span className="text-white font-bold">{decisions.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Top Segmented Tabs & User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCommandOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c222e] hover:bg-slate-700 text-neutral-300 border border-slate-700/80 text-xs font-mono transition-colors"
              title="Command Palette (Ctrl+K)"
            >
              <Command className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold">⌘K</span>
            </button>

            <nav className="flex items-center bg-[#151922] p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => handleTabChange('stream')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'stream'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>1. EVALUATE</span>
              </button>

              <button
                onClick={() => handleTabChange('rules')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'rules'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>2. RULES</span>
              </button>

              <button
                onClick={() => handleTabChange('reviews')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'reviews'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>3. QUEUE</span>
              </button>

              <button
                onClick={() => handleTabChange('velocity')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'velocity'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>4. VELOCITY</span>
              </button>

              <button
                onClick={() => handleTabChange('backtest')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'backtest'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>5. BACKTEST</span>
              </button>

              <button
                onClick={() => handleTabChange('graph')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'graph'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>6. GRAPH</span>
              </button>

              <button
                onClick={() => handleTabChange('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'ledger'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>7. LEDGER</span>
              </button>
            </nav>

            {/* Auth Profile Widget */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:flex flex-col items-end font-mono">
                  <span className="text-xs font-bold text-white">{user.name}</span>
                  <span className="text-[9px] text-cyan-400 tracking-wider uppercase">
                    [{user.role === 'ROLE_ADMIN' ? 'ADMIN' : 'ANALYST'}]
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg bg-[#1c222e] text-neutral-300 hover:text-white hover:bg-slate-700 border border-slate-700/80 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c222e] hover:bg-slate-700 text-neutral-200 font-mono font-bold text-xs border border-slate-700/80 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>AUTH</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container with Left Sidebar */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <aside className="w-56 bg-[#151922] border-r border-slate-800/80 hidden xl:flex flex-col justify-between p-3.5 font-mono">
          <div className="space-y-4">
            <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider px-2">
              NAVIGATION
            </div>
            <nav className="space-y-1 text-xs">
              <button
                onClick={() => handleTabChange('stream')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'stream'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Evaluate</span>
              </button>

              <button
                onClick={() => handleTabChange('rules')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'rules'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Rules Engine</span>
              </button>

              <button
                onClick={() => handleTabChange('reviews')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'reviews'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                <span>Review Queue</span>
              </button>

              <button
                onClick={() => handleTabChange('velocity')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'velocity'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>Velocity</span>
              </button>

              <button
                onClick={() => handleTabChange('backtest')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'backtest'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                <span>Backtest</span>
              </button>

              <button
                onClick={() => handleTabChange('graph')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'graph'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Network className="w-4 h-4 text-rose-400" />
                <span>Entity Graph</span>
              </button>

              <button
                onClick={() => handleTabChange('ledger')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
                  activeTab === 'ledger'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/40 border-l-4 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Transaction Ledger</span>
              </button>
            </nav>
          </div>

          {/* Real Stream & Decision Telemetry Card */}
          <div className="bg-[#1c222e] border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase">
              <span>STREAM TELEMETRY</span>
              <span className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <div className={`text-[11px] font-bold ${status === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status === 'CONNECTED' ? 'SSE Channel Connected' : status === 'CONNECTING' ? 'Connecting to Broker...' : 'Stream Disconnected'}
            </div>
            
            <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[10px] text-neutral-300 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Processed Txns:</span>
                <span className="text-white font-bold">{decisions.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-emerald-400">Allow:</span>
                <span className="text-emerald-400 font-bold">{allowCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-amber-400">Review:</span>
                <span className="text-amber-400 font-bold">{reviewCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-rose-400">Block:</span>
                <span className="text-rose-400 font-bold">{blockCount}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span className="text-neutral-400">Avg Latency:</span>
                <span className="text-cyan-400 font-bold">{avgLatency} ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Last Ping:</span>
                <span className="text-neutral-300">{lastPing ? lastPing.split(' ')[0] : 'Standby'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden">
          {activeTab === 'stream' && (
            <div className="space-y-6">
              <TransactionSimulator />
              <LiveTransactionFeed
                decisions={decisions}
                status={status}
                lastPing={lastPing}
                onClear={clearDecisions}
              />
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              <RulesManager />
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <ReviewQueuePanel />
            </div>
          )}

          {activeTab === 'velocity' && (
            <div className="space-y-6">
              <VelocityTelemetryCard />
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="space-y-6">
              <BacktestStudio />
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="space-y-6">
              <GraphSyndicateVisualizer />
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <TransactionLedger />
            </div>
          )}
        </main>
      </div>

      {/* Command Palette Modal (Ctrl+K) */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 font-mono animate-in fade-in duration-150 text-white">
          <div className="bg-[#1c222e] border border-slate-700 rounded-lg max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  autoFocus
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Type a command or jump to workspace..."
                  className="bg-transparent border-none text-xs text-white placeholder-neutral-400 focus:outline-none w-full font-mono"
                />
              </div>
              <button
                onClick={() => setIsCommandOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-[10px] text-neutral-400 uppercase px-2 py-1">NAVIGATION SHORTCUTS</div>
              <button
                onClick={() => { handleTabChange('stream'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>1. Jump to Payment Evaluation Workbench</span>
                <span className="text-[10px] border border-current px-1 rounded">1</span>
              </button>
              <button
                onClick={() => { handleTabChange('rules'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>2. Open Strategy Rules Engine</span>
                <span className="text-[10px] border border-current px-1 rounded">2</span>
              </button>
              <button
                onClick={() => { handleTabChange('reviews'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>3. Open Compliance Review Dispatch Queue</span>
                <span className="text-[10px] border border-current px-1 rounded">3</span>
              </button>
              <button
                onClick={() => { handleTabChange('velocity'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>4. Open Redis Velocity Sliding Window Telemetry</span>
                <span className="text-[10px] border border-current px-1 rounded">4</span>
              </button>
              <button
                onClick={() => { handleTabChange('backtest'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>5. Open Historical Policy Backtest Studio</span>
                <span className="text-[10px] border border-current px-1 rounded">5</span>
              </button>
              <button
                onClick={() => { handleTabChange('graph'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>6. Open Syndicate Graph Intelligence Visualizer</span>
                <span className="text-[10px] border border-current px-1 rounded">6</span>
              </button>
              <button
                onClick={() => { handleTabChange('ledger'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>7. Open Transaction Ledger &amp; Adaptive Risk</span>
                <span className="text-[10px] border border-current px-1 rounded">7</span>
              </button>

              <div className="text-[10px] text-neutral-400 uppercase px-2 py-1 pt-2 border-t border-slate-700">QUICK ACTIONS</div>
              <button
                onClick={() => { loginAsDemo('ANALYST'); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>Authenticate as Demo Fraud Analyst</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                onClick={() => { clearDecisions(); setIsCommandOpen(false); }}
                className="w-full p-2 rounded-lg text-left hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>Clear Live SSE Stream Buffer</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal />

      {/* Status Footer */}
      <footer className="border-t border-slate-800/80 bg-[#151922] py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 font-mono gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-white">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>SENTINELX CORE DECISION ENGINE</span>
          </span>
          <span className="text-slate-700">|</span>
          <span>JAVA 21 LTS // SPRING BOOT 3.4 // REDIS 7 ZSET</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-neutral-400">SHORTCUTS: [1-6: NAV] [CTRL+K: PALETTE]</span>
          <span className="text-slate-700">|</span>
          <span>MISSION CLASSIFICATION: UNCLASSIFIED</span>
        </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
