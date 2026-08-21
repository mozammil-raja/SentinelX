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
  ShieldCheck,
  Activity,
  Sliders,
  ClipboardCheck,
  Gauge,
  FlaskConical,
  Share2,
  LogIn,
  LogOut,
} from 'lucide-react';

type Tab = 'stream' | 'rules' | 'reviews' | 'velocity' | 'backtest' | 'graph';

function DashboardContent() {
  const { status, decisions, lastPing, clearDecisions } = useDecisionStream();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('stream');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  SentinelX
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                  v1.0 LTS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Real-Time Fraud &amp; Risk Decisioning Platform</p>
            </div>
          </div>

          {/* Navigation Tabs & User Auth Widget */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('stream')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'stream'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Feed</span>
              </button>

              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'rules'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rules</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'reviews'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Review Queue</span>
              </button>

              <button
                onClick={() => setActiveTab('velocity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'velocity'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                <span>Velocity</span>
              </button>

              <button
                onClick={() => setActiveTab('backtest')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'backtest'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                <span>Backtest</span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'graph'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Graph Syndicate</span>
              </button>
            </nav>

            {/* Auth Profile Widget */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/40">
                    {user.role === 'ROLE_ADMIN' ? 'ADMIN' : 'ANALYST'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-950/50 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'stream' && (
          <div className="space-y-6 animate-in fade-in duration-200">
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
          <div className="space-y-6 animate-in fade-in duration-200">
            <RulesManager />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ReviewQueuePanel />
          </div>
        )}

        {activeTab === 'velocity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <VelocityTelemetryCard />
          </div>
        )}

        {activeTab === 'backtest' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <BacktestStudio />
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <GraphSyndicateVisualizer />
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        SentinelX • Spring Boot 3.4.x (Java 21 LTS) + Redis ZSET Velocity + Graph Syndicate Engine + Next.js
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
