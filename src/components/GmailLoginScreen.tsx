import React, { useState } from 'react';
import { Clock, ShieldCheck, Sun, Moon, CheckCircle2, FileSpreadsheet, Target } from 'lucide-react';
import { signInWithGmail } from '../firebase';

interface GmailLoginScreenProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenTerms: () => void;
}

export const GmailLoginScreen: React.FC<GmailLoginScreenProps> = ({
  theme,
  onToggleTheme,
  onOpenTerms,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGmail();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing login.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setError(err?.message || 'Unable to sign in with Gmail. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Clock size={18} />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
            OJT DTR Tracker
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Info Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Daily Time Record Workspace
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
                Track your OJT hours accurately across every shift
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Sign in with your Gmail account to sync your custom hours target, daily attendance
                ledger, and supervisor-ready reports securely across sessions.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <FeatureRow
                icon={<Target size={17} className="text-blue-600 dark:text-blue-400" />}
                title="Custom Hours Target"
                description="Configure 120, 240, 500, or any school-mandated OJT hour goal with projected finish dates."
              />
              <FeatureRow
                icon={<Clock size={17} className="text-emerald-600 dark:text-emerald-400" />}
                title="Precision Break & Overnight Math"
                description="Automatically deducts breaks, handles midnight-crossing shifts, and supports bulk date ranges."
              />
              <FeatureRow
                icon={<FileSpreadsheet size={17} className="text-slate-600 dark:text-slate-300" />}
                title="Supervisor-Ready Exports"
                description="Download formal PDF sheets with signature blocks, Excel workbooks, CSVs, and JSON backups."
              />
            </div>
          </div>

          {/* Right Sign-In Card */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Sign in with Gmail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Use your Google / Gmail account to create your private DTR workspace. New users
                will set their hours target and accept Terms &amp; Conditions next.
              </p>
            </div>

            <div className="my-8 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 text-xs text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-60 shadow-xs"
              >
                <GoogleMark />
                <span>{loading ? 'Signing in...' : 'Continue with Gmail'}</span>
              </button>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Your records stay private to your Gmail account and remain cached for offline
                  viewing.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} /> Protected access
              </span>
              <button
                type="button"
                onClick={onOpenTerms}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Terms &amp; Conditions
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const FeatureRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

const GoogleMark: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);
