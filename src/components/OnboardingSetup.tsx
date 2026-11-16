import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  Target,
  User,
  FileText,
  LogOut,
} from 'lucide-react';
import { AppConfig, UserProfile } from '../types';

interface OnboardingSetupProps {
  initialUser: UserProfile;
  initialConfig: AppConfig;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onComplete: (profile: UserProfile, targetHours: number, timeFormat: '12h' | '24h') => Promise<void> | void;
  onOpenTerms: () => void;
}

const PRESET_TARGETS = [120, 240, 300, 480, 500, 600];

export const OnboardingSetup: React.FC<OnboardingSetupProps> = ({
  initialUser,
  initialConfig,
  onToggleTheme,
  onSignOut,
  onComplete,
  onOpenTerms,
}) => {
  const [name, setName] = useState(initialUser.name || '');
  const [supervisorName, setSupervisorName] = useState(initialUser.supervisorName || '');
  const [department, setDepartment] = useState(initialUser.department || '');
  const [trainingCategory, setTrainingCategory] = useState(
    initialUser.trainingCategory || ''
  );

  const [targetHoursInput, setTargetHoursInput] = useState<string>(
    String(initialConfig.targetHours || 120)
  );
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(
    initialConfig.timeFormat || '12h'
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const parsedTarget = Number(targetHoursInput);
  const isTargetValid = !Number.isNaN(parsedTarget) && parsedTarget >= 1 && parsedTarget <= 5000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name to personalize your DTR records.');
      return;
    }

    if (!isTargetValid) {
      setErrorMsg('Please enter a valid required OJT hours target between 1 and 5,000.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('Please read and accept the Terms & Conditions to continue.');
      return;
    }

    const profile: UserProfile = {
      ...initialUser,
      name: name.trim(),
      supervisorName: supervisorName.trim(),
      department: department.trim(),
      trainingCategory,
    };

    try {
      setSubmitting(true);
      await onComplete(profile, Math.round(parsedTarget * 10) / 10, timeFormat);
    } catch {
      setErrorMsg('Failed to save your setup. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
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

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
            {initialUser.email}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut size={14} />
            Switch Gmail
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {initialConfig.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              New User Setup · Signed in as {initialUser.email}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Configure your OJT hours target &amp; profile
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Before logging your first shift, set your school&apos;s required OJT hours target,
              confirm your trainee details for supervisor reports, and accept the terms below.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8"
          >
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {errorMsg}
              </div>
            )}

            {/* Step 1: Required Hours Target */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Target size={17} className="text-blue-600 dark:text-blue-400" />
                <h2>01. Set Your Required Hours Target</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Custom Target Hours *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      step="0.5"
                      required
                      value={targetHoursInput}
                      onChange={(e) => setTargetHoursInput(e.target.value)}
                      placeholder="e.g. 300"
                      className="w-full px-3.5 py-2.5 pr-12 text-base font-mono tabular-nums font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      hrs
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Or choose a common requirement
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TARGETS.map((hrs) => {
                      const active = Number(targetHoursInput) === hrs;
                      return (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setTargetHoursInput(String(hrs))}
                          className={`px-3 py-2 text-xs font-mono tabular-nums font-semibold rounded-lg border transition-colors ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {hrs}h
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Trainee & Supervisor Profile */}
            <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <User size={17} className="text-blue-600 dark:text-blue-400" />
                <h2>02. Student &amp; OJT Placement Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Jordan Barberz"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Gmail Account
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={initialUser.email}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Supervisor Name
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="For PDF sign-off lines"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Department / Company
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., IT / Software Engineering"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Training Category
                  </label>
                  <select
                    value={trainingCategory}
                    onChange={(e) => setTrainingCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    <option value="IT/Software">IT / Software</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Admin/HR">Admin / HR</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Preferred Time Display
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="12h">12-hour (7:00 AM – 5:00 PM)</option>
                    <option value="24h">24-hour (07:00 – 17:00)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Step 3: Terms & Conditions */}
            <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <ShieldCheck size={17} className="text-blue-600 dark:text-blue-400" />
                  <h2>03. Terms &amp; Conditions</h2>
                </div>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <FileText size={13} />
                  Read Full Terms
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 max-h-40 overflow-y-auto leading-relaxed">
                <p>
                  <strong className="text-slate-900 dark:text-slate-200">
                    1. Private Cloud &amp; Offline Sync:
                  </strong>{' '}
                  Your DTR entries, target hours, and profile settings are tied to your Gmail
                  account and stored privately in Firebase Firestore with local browser caching for
                  offline access.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-slate-200">
                    2. Record Accuracy &amp; Verification:
                  </strong>{' '}
                  You are responsible for accurately logging your Time In, Time Out, breaks, and
                  remarks. Exported DTR sheets are intended as supporting records and require your
                  supervisor&apos;s official validation and signature.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-slate-200">
                    3. Privacy &amp; Backups:
                  </strong>{' '}
                  Your Gmail profile (name, email, avatar) is used strictly to identify your account
                  and populate report headers. We recommend exporting periodic PDF or JSON backups.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Terms &amp; Conditions
                  </button>{' '}
                  for using OJT DTR Tracker with my Gmail account.
                </span>
              </label>
            </section>

            {/* Submit */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>You can update your hours target anytime in Preferences.</span>
              </div>
              <button
                type="submit"
                disabled={!agreedToTerms || submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <span>{submitting ? 'Saving Setup...' : 'Complete Setup & Start Tracking'}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
