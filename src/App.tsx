import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  FileText,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Trash2,
  Search,
  Database,
  Clock,
  Menu,
  X,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { DTREntry, UserProfile, AppConfig, ToastMessage } from './types';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  signOutGmail,
  createOrUpdateUserSettings,
  saveDTREntry,
  saveDTREntriesBatch,
  deleteDTREntryDoc,
  deleteAllDTREntries,
} from './firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { EntryForm } from './components/EntryForm';
import { BulkEntry } from './components/BulkEntry';
import { DTRTable } from './components/DTRTable';
import { ExportActions } from './components/ExportActions';
import { ToastContainer } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { OnboardingSetup } from './components/OnboardingSetup';
import { TermsModal } from './components/TermsModal';
import { GmailLoginScreen } from './components/GmailLoginScreen';
import { cn, toLocalDateString } from './utils/helpers';

type TabId = 'dashboard' | 'single' | 'bulk' | 'reports' | 'settings';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userDocExists, setUserDocExists] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<DTREntry[]>([]);

  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const savedTheme = localStorage.getItem('dtr_theme');
      return {
        targetHours: 120,
        theme: savedTheme === 'dark' ? 'dark' : 'light',
        timeFormat: '12h',
        roundTo15Min: false,
        onboardingCompleted: false,
      };
    } catch {
      return {
        targetHours: 120,
        theme: 'light',
        timeFormat: '12h',
        roundTo15Min: false,
        onboardingCompleted: false,
      };
    }
  });

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<DTREntry | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const profileSyncTimerRef = useRef<number | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme class sync
  useEffect(() => {
    localStorage.setItem('dtr_theme', config.theme);
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFbUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setUser(null);
        setEntries([]);
        setUserDocExists(false);
        setProfileLoaded(true);
        return;
      }

      // Hydrate offline cache immediately while Firestore syncs
      setProfileLoaded(false);
      try {
        const cachedProfile = localStorage.getItem(`dtr_cache_profile_${currentUser.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.user) setUser(parsed.user);
          if (parsed.config) {
            setConfig((prev) => ({ ...prev, ...parsed.config, theme: prev.theme }));
          }
        } else {
          setUser({
            id: currentUser.uid,
            name: currentUser.displayName || 'OJT Student',
            email: currentUser.email || '',
            picture: currentUser.photoURL || '',
          });
        }

        const cachedEntries = localStorage.getItem(`dtr_cache_entries_${currentUser.uid}`);
        if (cachedEntries) {
          setEntries(JSON.parse(cachedEntries));
        }
      } catch {
        // Ignore malformed cache
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore real-time listeners (strictly gated on authenticated user)
  useEffect(() => {
    if (!authReady || !fbUser) return;

    const uid = fbUser.uid;
    const userDocPath = `users/${uid}`;
    const userDocRef = doc(db, 'users', uid);

    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const hydratedUser: UserProfile = {
            id: uid,
            name: data.name || fbUser.displayName || 'OJT Student',
            email: data.email || fbUser.email || '',
            picture: data.picture || fbUser.photoURL || '',
            supervisorName: data.supervisorName || '',
            department: data.department || '',
            trainingCategory: data.trainingCategory || '',
          };
          const hydratedConfigPatch: Partial<AppConfig> = {
            targetHours: typeof data.targetHours === 'number' ? data.targetHours : 120,
            timeFormat: data.timeFormat === '24h' ? '24h' : '12h',
            roundTo15Min: Boolean(data.roundTo15Min),
            onboardingCompleted: Boolean(data.onboardingCompleted),
            acceptedTermsAt: data.acceptedTermsAt || undefined,
          };

          setUser(hydratedUser);
          setConfig((prev) => {
            const next = { ...prev, ...hydratedConfigPatch };
            localStorage.setItem(
              `dtr_cache_profile_${uid}`,
              JSON.stringify({ user: hydratedUser, config: next })
            );
            return next;
          });
          setUserDocExists(true);
        } else {
          setUser({
            id: uid,
            name: fbUser.displayName || '',
            email: fbUser.email || '',
            picture: fbUser.photoURL || '',
          });
          setConfig((prev) => ({
            ...prev,
            onboardingCompleted: false,
            acceptedTermsAt: undefined,
          }));
          setUserDocExists(false);
        }
        setProfileLoaded(true);
      },
      (error) => {
        setProfileLoaded(true);
        handleFirestoreError(error, OperationType.GET, userDocPath);
      }
    );

    const entriesPath = `users/${uid}/entries`;
    const entriesQuery = query(collection(db, 'users', uid, 'entries'), where('uid', '==', uid));

    const unsubEntries = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const list: DTREntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            date: data.date,
            timeIn: data.timeIn,
            timeOut: data.timeOut,
            breakMinutes: Number(data.breakMinutes) || 0,
            isOvertime: Boolean(data.isOvertime),
            overtimeReason: data.overtimeReason || '',
            remarks: data.remarks || '',
            type: data.type || 'regular',
            totalHours: Number(data.totalHours) || 0,
          };
        });
        setEntries(list);
        localStorage.setItem(`dtr_cache_entries_${uid}`, JSON.stringify(list));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, entriesPath);
      }
    );

    return () => {
      unsubProfile();
      unsubEntries();
    };
  }, [authReady, fbUser]);

  const totalHoursCompleted = useMemo(
    () => entries.reduce((sum, e) => sum + e.totalHours, 0),
    [entries]
  );

  const existingDates = useMemo(() => entries.map((e) => e.date), [entries]);

  const persistSettings = useCallback(
    async (nextUser: UserProfile, nextConfig: AppConfig, isNew = !userDocExists) => {
      if (!fbUser) return;
      await createOrUpdateUserSettings(fbUser.uid, nextUser, nextConfig, isNew);
      localStorage.setItem(
        `dtr_cache_profile_${fbUser.uid}`,
        JSON.stringify({ user: nextUser, config: nextConfig })
      );
    },
    [fbUser, userDocExists]
  );

  const scheduleProfileSync = (nextUser: UserProfile, nextConfig: AppConfig) => {
    if (profileSyncTimerRef.current) {
      window.clearTimeout(profileSyncTimerRef.current);
    }
    profileSyncTimerRef.current = window.setTimeout(() => {
      persistSettings(nextUser, nextConfig).catch(() => {
        notify('error', 'Sync failed', 'Could not save profile changes to Firestore.');
      });
    }, 450);
  };

  const handleSaveEntry = async (entry: DTREntry) => {
    if (!fbUser) return;
    const isUpdate = Boolean(editingEntry);
    try {
      await saveDTREntry(fbUser.uid, entry, isUpdate);
      if (isUpdate) {
        setEditingEntry(null);
        notify('success', 'Record updated', `${entry.date} (${entry.totalHours.toFixed(1)} hrs)`);
      } else {
        notify('success', 'Time record added', `${entry.date} · ${entry.totalHours.toFixed(1)} hrs logged`);
      }
      setActiveTab('dashboard');
    } catch {
      notify('error', 'Save failed', 'Could not save entry to your Gmail workspace.');
    }
  };

  const handleAddMultiple = async (newEntries: DTREntry[]) => {
    if (!fbUser) return;
    try {
      await saveDTREntriesBatch(fbUser.uid, newEntries);
      const batchHours = newEntries.reduce((s, e) => s + e.totalHours, 0);
      notify(
        'success',
        `Added ${newEntries.length} records`,
        `${batchHours.toFixed(1)} total hours synced to your DTR ledger.`
      );
      setActiveTab('dashboard');
    } catch {
      notify('error', 'Bulk save failed', 'Could not save batch entries.');
    }
  };

  const handleImportEntries = async (imported: DTREntry[]) => {
    if (!fbUser) return;
    const existingDateSet = new Set(entries.map((e) => e.date));
    const fresh = imported.filter((item) => !existingDateSet.has(item.date));
    const skipped = imported.length - fresh.length;

    if (fresh.length === 0) {
      notify(
        'warning',
        'No new records imported',
        `All ${imported.length} date(s) already exist in your ledger.`
      );
      return;
    }

    try {
      await saveDTREntriesBatch(fbUser.uid, fresh);
      notify(
        'success',
        `Imported ${fresh.length} record(s)`,
        skipped > 0 ? `Skipped ${skipped} duplicate date(s).` : undefined
      );
    } catch {
      notify('error', 'Import failed', 'Could not write imported entries to Firestore.');
    }
  };

  const requestDeleteEntry = (entry: DTREntry) => {
    if (!fbUser) return;
    setConfirmState({
      open: true,
      title: 'Delete Time Record',
      description: `Remove the DTR entry for ${entry.date} (${entry.totalHours.toFixed(1)} hrs)? This action cannot be undone.`,
      confirmLabel: 'Delete Record',
      onConfirm: () => {
        deleteDTREntryDoc(fbUser.uid, entry.id)
          .then(() => {
            notify('info', 'Record deleted', `Removed entry for ${entry.date}.`);
          })
          .catch(() => {
            notify('error', 'Delete failed', 'Could not delete entry.');
          });
      },
    });
  };

  const requestClearAll = () => {
    if (!fbUser) return;
    setConfirmState({
      open: true,
      title: 'Clear All DTR Records',
      description: `This will permanently delete all ${entries.length} logged records from your Gmail workspace. Make sure you have exported a backup if needed.`,
      confirmLabel: 'Clear Everything',
      onConfirm: () => {
        deleteAllDTREntries(
          fbUser.uid,
          entries.map((e) => e.id)
        )
          .then(() => {
            notify('info', 'All records cleared', 'Your DTR ledger is now empty.');
          })
          .catch(() => {
            notify('error', 'Clear failed', 'Could not clear all entries.');
          });
      },
    });
  };

  const loadSampleData = async () => {
    if (!fbUser) return;
    const sampleEntries: DTREntry[] = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 21);

    let workdayIndex = 0;
    for (let i = 0; i < 22 && sampleEntries.length < 15; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const isOT = workdayIndex % 5 === 4;
      sampleEntries.push({
        id: crypto.randomUUID(),
        date: toLocalDateString(d),
        timeIn: workdayIndex % 3 === 1 ? '06:30' : '07:00',
        timeOut: isOT ? '18:00' : workdayIndex % 3 === 1 ? '16:30' : '17:00',
        breakMinutes: 60,
        isOvertime: isOT,
        overtimeReason: isOT ? 'Sprint release preparation' : '',
        remarks:
          workdayIndex % 2 === 0
            ? 'IT Department · Frontend engineering tasks'
            : 'IT Department · QA & documentation',
        type: 'regular',
        totalHours: isOT ? 10.0 : 9.0,
      });
      workdayIndex++;
    }

    try {
      await saveDTREntriesBatch(fbUser.uid, sampleEntries);
      const total = sampleEntries.reduce((s, e) => s + e.totalHours, 0);
      notify(
        'success',
        'Sample OJT data loaded',
        `Loaded ${sampleEntries.length} workdays (${total.toFixed(1)} hrs) to preview progress.`
      );
      setActiveTab('dashboard');
    } catch {
      notify('error', 'Failed to load sample data', 'Please try again.');
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.remarks.toLowerCase().includes(q) ||
        e.date.includes(q) ||
        (e.overtimeReason || '').toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'single', label: 'Single Entry', icon: PlusCircle },
    { id: 'bulk', label: 'Bulk Entry', icon: Layers },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const tabTitles: Record<TabId, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Overview',
      subtitle: 'Monitor your OJT progress, daily velocity, and time ledger.',
    },
    single: {
      title: editingEntry ? 'Edit Entry' : 'Single Entry',
      subtitle: 'Log an individual shift with automatic break deduction.',
    },
    bulk: {
      title: 'Bulk Entry',
      subtitle: 'Generate a multi-day schedule and customize exceptions inline.',
    },
    reports: {
      title: 'Reports & Backup',
      subtitle: 'Export supervisor-ready PDFs, spreadsheets, or restore backups.',
    },
    settings: {
      title: 'Preferences',
      subtitle: 'Configure your required OJT hours, time format, and student profile.',
    },
  };

  const handleNavClick = (id: TabId) => {
    setActiveTab(id);
    if (id !== 'single') setEditingEntry(null);
    setMobileMenuOpen(false);
  };

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    if (!user) return;
    const nextUser: UserProfile = { ...user, [field]: value };
    setUser(nextUser);
    scheduleProfileSync(nextUser, config);
  };

  const updateConfigField = (patch: Partial<AppConfig>, syncNow = true) => {
    const nextConfig: AppConfig = { ...config, ...patch };
    setConfig(nextConfig);
    if (syncNow && user && fbUser) {
      persistSettings(user, nextConfig).catch(() => {
        notify('error', 'Sync failed', 'Could not update preferences in Firestore.');
      });
    }
  };

  const handleCompleteOnboarding = async (
    profile: UserProfile,
    targetHours: number,
    timeFormat: '12h' | '24h'
  ) => {
    const nextConfig: AppConfig = {
      ...config,
      targetHours,
      timeFormat,
      onboardingCompleted: true,
      acceptedTermsAt: config.acceptedTermsAt || new Date().toISOString(),
    };

    await persistSettings(profile, nextConfig, !userDocExists);
    setUser(profile);
    setConfig(nextConfig);
    setUserDocExists(true);
    notify(
      'success',
      `Welcome, ${profile.name}!`,
      `Your ${targetHours}-hour OJT target is ready.`
    );
  };

  const handleLogout = async () => {
    try {
      await signOutGmail();
      notify('info', 'Signed out of Gmail');
    } catch {
      notify('error', 'Sign-out failed', 'Please try again.');
    }
  };

  // Loading Screen while Firebase Auth or initial Firestore profile resolves
  if (!authReady || (fbUser && !profileLoaded)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
          <Clock size={20} className="animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading your OJT workspace...
        </p>
      </div>
    );
  }

  // Unauthenticated -> Gmail Sign-In Screen
  if (!fbUser || !user) {
    return (
      <>
        <GmailLoginScreen
          theme={config.theme}
          onToggleTheme={() =>
            setConfig((prev) => ({
              ...prev,
              theme: prev.theme === 'light' ? 'dark' : 'light',
            }))
          }
          onOpenTerms={() => setTermsOpen(true)}
        />
        <TermsModal
          open={termsOpen}
          acceptedAt={config.acceptedTermsAt}
          onClose={() => setTermsOpen(false)}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // First-time Authenticated User -> Required Hours Target & Terms Setup
  if (!config.onboardingCompleted) {
    return (
      <>
        <OnboardingSetup
          initialUser={user}
          initialConfig={config}
          onToggleTheme={() =>
            setConfig((prev) => ({
              ...prev,
              theme: prev.theme === 'light' ? 'dark' : 'light',
            }))
          }
          onSignOut={handleLogout}
          onComplete={handleCompleteOnboarding}
          onOpenTerms={() => setTermsOpen(true)}
        />
        <TermsModal
          open={termsOpen}
          acceptedAt={config.acceptedTermsAt}
          onClose={() => setTermsOpen(false)}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 no-print">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            OJT DTR Tracker
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap',
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Compact Progress Summary in Sidebar */}
        <div className="px-4 py-3 mx-3 mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-500 dark:text-slate-400">OJT Target</span>
            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
              {totalHoursCompleted.toFixed(1)} / {config.targetHours}h
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (totalHoursCompleted / Math.max(1, config.targetHours)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <Auth user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden no-print">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50"
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                    OJT DTR Tracker
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  aria-label="Close navigation menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1">
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                <Auth user={user} onLogout={handleLogout} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Column */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap">
                OJT Workspace
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                {tabTitles[activeTab].title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  theme: prev.theme === 'light' ? 'dark' : 'light',
                }))
              }
              className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label={`Switch to ${config.theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${config.theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {config.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setActiveTab('single');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle size={15} />
              <span>Log Hours</span>
            </button>
          </div>
        </header>

        {/* Print-Only Formal Header */}
        <div className="print-only mb-6 pb-4 border-b border-slate-300">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Daily Time Record (DTR)</h1>
              <p className="text-sm text-slate-600 mt-1">
                Student: {user.name} {user.email ? `(${user.email})` : ''}
              </p>
              <p className="text-sm text-slate-600">
                Department: {user.department || 'N/A'} · Category: {user.trainingCategory || 'N/A'}
              </p>
            </div>
            <div className="text-right text-sm text-slate-700">
              <p>Required Hours: {config.targetHours} hrs</p>
              <p className="font-bold">Total Completed: {totalHoursCompleted.toFixed(1)} hrs</p>
              <p>Supervisor: {user.supervisorName || '____________________'}</p>
            </div>
          </div>
        </div>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto">
          {/* Page Header + Search */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 no-print">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {tabTitles[activeTab].title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {tabTitles[activeTab].subtitle}
              </p>
            </div>

            {(activeTab === 'dashboard' || activeTab === 'reports') && (
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search remarks or dates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  <Dashboard
                    entries={entries}
                    config={config}
                    onQuickAdd={() => {
                      setEditingEntry(null);
                      setActiveTab('single');
                    }}
                    onLoadSample={loadSampleData}
                    onUpdateTargetHours={(newTarget) => {
                      updateConfigField({ targetHours: newTarget });
                      notify('success', 'Hours target updated', `New target set to ${newTarget} hrs.`);
                    }}
                  />

                  <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Time Record Ledger
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Color highlights: blue for weekends, amber for holidays, red for absences.
                        </p>
                      </div>
                      <ExportActions
                        entries={entries}
                        user={user}
                        config={config}
                        onNotify={notify}
                      />
                    </div>

                    <DTRTable
                      entries={filteredEntries}
                      config={config}
                      onRequestDelete={requestDeleteEntry}
                      onEdit={(entry) => {
                        setEditingEntry(entry);
                        setActiveTab('single');
                      }}
                    />
                  </section>
                </div>
              )}

              {activeTab === 'single' && (
                <div className="max-w-2xl">
                  <EntryForm
                    onAdd={handleSaveEntry}
                    onCancelEdit={() => {
                      setEditingEntry(null);
                      setActiveTab('dashboard');
                    }}
                    initialData={editingEntry}
                    existingDates={existingDates}
                    config={config}
                    userId={user.id}
                    onNotify={notify}
                  />
                </div>
              )}

              {activeTab === 'bulk' && (
                <BulkEntry
                  onAddMultiple={handleAddMultiple}
                  existingDates={existingDates}
                  config={config}
                  onNotify={notify}
                />
              )}

              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 no-print">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Supervisor Summary &amp; Data Portability
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Student: <strong>{user.name}</strong> · Supervisor:{' '}
                          <strong>{user.supervisorName || 'Not specified'}</strong> · Completed:{' '}
                          <strong className="font-mono tabular-nums">
                            {totalHoursCompleted.toFixed(1)} / {config.targetHours} hrs
                          </strong>
                        </p>
                      </div>
                    </div>

                    <ExportActions
                      entries={entries}
                      user={user}
                      config={config}
                      showBackupControls
                      onImportEntries={handleImportEntries}
                      onNotify={notify}
                    />
                  </div>

                  <DTRTable
                    entries={filteredEntries}
                    config={config}
                    onRequestDelete={requestDeleteEntry}
                    onEdit={(entry) => {
                      setEditingEntry(entry);
                      setActiveTab('single');
                    }}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-2xl space-y-6">
                  {/* Target & Display Settings */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 pb-4 border-b border-slate-100 dark:border-slate-800">
                      Tracker Preferences
                    </h2>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Required OJT Hours
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Standard target is 120 hours, or choose 240 / 500 hours.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[120, 240, 500].map((hrs) => (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => updateConfigField({ targetHours: hrs })}
                            className={`px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold rounded-lg border transition-colors ${
                              config.targetHours === hrs
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {hrs}h
                          </button>
                        ))}
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          aria-label="Custom target hours"
                          value={config.targetHours}
                          onChange={(e) => {
                            const val = Math.min(
                              5000,
                              Math.max(1, parseInt(e.target.value, 10) || 120)
                            );
                            updateConfigField({ targetHours: val });
                          }}
                          className="w-20 px-2.5 py-1.5 text-sm font-mono tabular-nums text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Time Display Format
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Applies to the ledger table, PDF exports, and spreadsheets.
                        </p>
                      </div>
                      <select
                        value={config.timeFormat}
                        onChange={(e) =>
                          updateConfigField({ timeFormat: e.target.value as '12h' | '24h' })
                        }
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour (Military)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Round Net Duration to Nearest 15 Minutes
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Automatically snap new entries to 0.25-hour increments.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(config.roundTo15Min)}
                        onChange={(e) =>
                          updateConfigField({ roundTo15Min: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* OJT Student & Supervisor Profile */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <User size={18} className="text-blue-600 dark:text-blue-400" />
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Student &amp; Supervisor Details
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Student Full Name
                        </label>
                        <input
                          type="text"
                          value={user.name || ''}
                          onChange={(e) => updateProfileField('name', e.target.value)}
                          placeholder="e.g., Jordan Barberz"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Supervisor Name
                        </label>
                        <input
                          type="text"
                          value={user.supervisorName || ''}
                          onChange={(e) => updateProfileField('supervisorName', e.target.value)}
                          placeholder="Enter supervisor name"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Department / Host Company
                        </label>
                        <input
                          type="text"
                          value={user.department || ''}
                          onChange={(e) => updateProfileField('department', e.target.value)}
                          placeholder="e.g., IT / Engineering"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Training Category
                        </label>
                        <select
                          value={user.trainingCategory || ''}
                          onChange={(e) => updateProfileField('trainingCategory', e.target.value)}
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
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Sample Data &amp; Reset
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Populate 15 sample OJT days (135+ hours) to preview reports, or clear all
                      stored records.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={loadSampleData}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-xl transition-colors"
                      >
                        <Database size={15} />
                        Load Sample OJT Data
                      </button>

                      <button
                        type="button"
                        onClick={() => updateConfigField({ onboardingCompleted: false })}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        Re-open Setup &amp; Terms
                      </button>

                      <button
                        type="button"
                        disabled={entries.length === 0}
                        onClick={requestClearAll}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-950 rounded-xl transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                        Clear All Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Print-Only Formal Signature Footer */}
          <div className="print-only mt-12 pt-8 grid grid-cols-2 gap-12 text-center text-xs text-slate-700">
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold">
                {user.name || 'Student Signature'}
              </div>
              <div className="text-slate-500 mt-0.5">OJT Trainee Signature &amp; Date</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold">
                {user.supervisorName || 'Supervisor Signature'}
              </div>
              <div className="text-slate-500 mt-0.5">Immediate Supervisor Signature &amp; Date</div>
            </div>
          </div>

          <footer className="mt-14 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 no-print">
            <span>OJT DTR Tracker — {config.targetHours} Hour Edition</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="hover:text-slate-900 dark:hover:text-slate-200 underline underline-offset-2 transition-colors"
              >
                Terms &amp; Conditions
              </button>
              <span aria-hidden="true">·</span>
              <span>Synced with {user.email}</span>
            </div>
          </footer>
        </main>
      </div>

      <TermsModal
        open={termsOpen}
        acceptedAt={config.acceptedTermsAt}
        onClose={() => setTermsOpen(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
