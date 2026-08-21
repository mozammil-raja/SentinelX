'use client';

import { useAuth } from '@/lib/auth';
import { ShieldCheck, UserCheck, Sparkles, X, Lock } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginAsDemo, loginWithGoogle } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-slate-950 font-bold shadow-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Analyst Workstation Sign In</h3>
            <p className="text-xs text-slate-400">Authenticate to modify risk rules &amp; resolve cases</p>
          </div>
        </div>

        {/* 1-Click Demo Analyst Login (Recommended for Interview) */}
        <div className="space-y-3 pt-2">
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                1-Click Demo Analyst Mode
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant login as a verified Fraud Analyst for offline interview demonstrations.
            </p>
            <button
              onClick={() => loginAsDemo('ANALYST')}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-950/50 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>Login as Fraud Analyst (Alex Vance)</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Demo Risk Lead Mode</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                Admin Role
              </span>
            </div>
            <button
              onClick={() => loginAsDemo('ADMIN')}
              className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Login as Risk Admin (Sarah Connor)</span>
            </button>
          </div>

          {/* Google OAuth Option */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => loginWithGoogle('google_jwt_sample_token', 'analyst@google.com', 'Google User')}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 active:bg-slate-200 text-xs font-semibold text-slate-900 flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Continue with Google OAuth</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
