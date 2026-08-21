'use client';

import { useState } from 'react';
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
import {
  Shield,
  Activity,
  SlidersHorizontal,
  ClipboardList,
  Gauge,
  FlaskConical,
  Network,
  LogIn,
  LogOut,
  Terminal,
} from 'lucide-react';

type Tab = 'stream' | 'rules' | 'reviews' | 'velocity' | 'backtest' | 'graph';

function DashboardContent() {
  const { status, decisions, lastPing, clearDecisions } = useDecisionStream();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('stream');

  return (
    <div className="min-h-screen bg-[#353535] text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Tactical Header with #353535 and White Boundary */}
      <header className="border-b border-white bg-[#353535] sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand & System Telemetry */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-sm tracking-wider uppercase text-white">
                  SENTINELX
                </span>
                <span className="text-[10px] font-mono text-neutral-300 hidden sm:inline">
                  DECISION_KERNEL // v1.0
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-white text-[11px] font-mono text-neutral-300">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full border border-white ${status === 'CONNECTED' ? 'bg-white' : status === 'CONNECTING' ? 'bg-neutral-400' : 'bg-transparent'}`} />
                <span className="text-white">STREAM: {status}</span>
              </div>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-300">ENGINE: <span className="text-white font-bold">&lt;15ms</span></span>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-300">DECISIONS: <span className="text-white font-bold">{decisions.length}</span></span>
            </div>
          </div>

          {/* Navigation Segmented Controls & User Profile */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center bg-[#353535] p-0.5 rounded border border-white text-xs font-mono">
              <button
                onClick={() => setActiveTab('stream')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'stream'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>EVALUATE</span>
              </button>

              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>RULES</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'reviews'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>QUEUE</span>
              </button>

              <button
                onClick={() => setActiveTab('velocity')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'velocity'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>VELOCITY</span>
              </button>

              <button
                onClick={() => setActiveTab('backtest')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'backtest'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>BACKTEST</span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  activeTab === 'graph'
                    ? 'bg-white text-black font-bold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>GRAPH</span>
              </button>
            </nav>

            {/* Auth Profile Widget */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white">
                <div className="hidden md:flex flex-col items-end font-mono">
                  <span className="text-xs font-bold text-white">{user.name}</span>
                  <span className="text-[9px] text-neutral-300 tracking-wider uppercase">
                    [{user.role === 'ROLE_ADMIN' ? 'ADMIN' : 'ANALYST'}]
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded bg-white text-black hover:bg-neutral-200 border border-white transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-black font-mono font-bold text-xs hover:bg-neutral-200 border border-white transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>AUTH</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Tactical Surface */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-6">
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
      </main>

      {/* Auth Modal */}
      <AuthModal />

      {/* Status Footer */}
      <footer className="border-t border-white bg-[#353535] py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-300 font-mono gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-white">
            <Terminal className="w-3.5 h-3.5 text-white" />
            <span>SENTINELX CORE DECISION ENGINE</span>
          </span>
          <span className="text-neutral-400">|</span>
          <span>JAVA 21 LTS // SPRING BOOT 3.4 // REDIS 7 ZSET</span>
        </div>
        <div>
          <span className="text-neutral-300">MISSION CLASSIFICATION: UNCLASSIFIED // SIMULATION LABORATORY</span>
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
