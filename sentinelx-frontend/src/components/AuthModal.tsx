'use client';

import { useAuth } from '@/lib/auth';
import { ShieldCheck, UserCheck, X, Lock, KeyRound } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginAsDemo } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono animate-in fade-in duration-150 text-white">
      <div className="bg-[#1c222e] border border-slate-700/80 rounded-xl max-w-md w-full p-5 space-y-4 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/20">
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">ANALYST_WORKSTATION // AUTH</h3>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">Authenticate credentials to alter policy rules and clear queue items</p>
          </div>
        </div>

        {/* Demo Fast Login Modes */}
        <div className="space-y-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#151922] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                DEMO_ANALYST_SESSION
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-bold text-cyan-400">
                RECOMMENDED
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Instant login as a verified Fraud Analyst for live demonstration and queue clearance.
            </p>
            <button
              onClick={() => loginAsDemo('ANALYST')}
              className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all border border-blue-500/50 uppercase tracking-wider shadow-md shadow-blue-900/40"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>AUTHENTICATE AS FRAUD ANALYST</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#151922] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                DEMO_ADMIN_SESSION
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold">
                ROLE_ADMIN
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Elevated access to modify dynamic policy weights and trigger hard user bans.
            </p>
            <button
              onClick={() => loginAsDemo('ADMIN')}
              className="w-full py-2.5 px-3 rounded-lg bg-[#1c222e] hover:bg-slate-700 active:bg-slate-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors border border-slate-700 uppercase tracking-wider"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>AUTHENTICATE AS RISK ADMIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
