'use client';

import { useAuth } from '@/lib/auth';
import { ShieldCheck, UserCheck, X, Lock, KeyRound } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginAsDemo, loginWithGoogle } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono animate-in fade-in duration-150 text-white">
      <div className="bg-[#353535] border border-white rounded-lg max-w-md w-full p-5 space-y-4 relative">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1 rounded text-white hover:bg-white hover:text-black border border-transparent hover:border-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white pb-3">
          <div className="w-8 h-8 rounded bg-[#353535] border border-white flex items-center justify-center text-white">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">ANALYST_WORKSTATION // AUTH</h3>
            <p className="text-[11px] text-neutral-300 font-sans mt-0.5">Authenticate credentials to alter policy rules and clear queue items</p>
          </div>
        </div>

        {/* Demo Fast Login Modes */}
        <div className="space-y-2.5 pt-1">
          <div className="p-3.5 rounded bg-[#353535] border border-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-white" />
                DEMO_ANALYST_SESSION
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-white font-bold text-white">
                RECOMMENDED
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 font-sans">
              Instant login as a verified Fraud Analyst for live interview demonstration.
            </p>
            <button
              onClick={() => loginAsDemo('ANALYST')}
              className="w-full py-2 px-3 rounded bg-white hover:bg-neutral-200 active:bg-neutral-300 text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors border border-white uppercase tracking-wider"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>AUTHENTICATE AS FRAUD ANALYST</span>
            </button>
          </div>

          <div className="p-3.5 rounded bg-[#353535] border border-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase">DEMO_ADMIN_SESSION</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-white text-neutral-300">
                ROLE_ADMIN
              </span>
            </div>
            <button
              onClick={() => loginAsDemo('ADMIN')}
              className="w-full py-2 px-3 rounded bg-white hover:bg-neutral-200 active:bg-neutral-300 text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors border border-white uppercase tracking-wider"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
              <span>AUTHENTICATE AS RISK ADMIN</span>
            </button>
          </div>

          {/* Google OAuth Option */}
          <div className="pt-2 border-t border-white">
            <button
              onClick={() => loginWithGoogle('google_jwt_sample_token', 'analyst@google.com', 'Google User')}
              className="w-full py-2 px-3 rounded bg-white hover:bg-neutral-200 text-xs font-bold text-black flex items-center justify-center gap-2 transition-colors border border-white font-sans"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
              <span>AUTHENTICATE WITH GOOGLE OAUTH</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
