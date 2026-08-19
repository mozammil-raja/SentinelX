import { ShieldCheck, Zap, Activity, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-sm font-medium tracking-wide">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SentinelX — Real-Time Fraud & Risk Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          High-Velocity Decisioning & Fraud Detection
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Sub-50ms transaction risk evaluation, dynamic rule execution, real-time live feed, and continuous velocity tracking.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Zap className="w-5 h-5" />
              <h3>Sub-50ms Evaluation</h3>
            </div>
            <p className="text-sm text-slate-400">
              Low-latency synchronous scoring backed by Redis sliding window counters and in-memory caches.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Cpu className="w-5 h-5" />
              <h3>Dynamic Rule Engine</h3>
            </div>
            <p className="text-sm text-slate-400">
              Pluggable strategy-based rules dynamically reloaded from Postgres with weighted decision thresholds.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Activity className="w-5 h-5" />
              <h3>Live Event Stream</h3>
            </div>
            <p className="text-sm text-slate-400">
              Real-time Server-Sent Events (SSE) pipe streaming incoming transaction verdicts straight to the dashboard.
            </p>
          </div>
        </div>

        <div className="pt-6 text-xs text-slate-500 font-mono">
          Phases 1–5 complete • Dynamic rule engine &amp; Redis velocity (Spring Boot 3.x / Postgres / Redis) + Frontend (Next.js 16 / Tailwind)
        </div>
      </div>
    </div>
  );
}
