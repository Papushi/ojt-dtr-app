import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Layers, 
  FileText, 
  Settings as SettingsIcon,
  Sun,
  Moon,
  Database,
  Trash2,
  Search,
  Filter,
  Info,
  Clock,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DTREntry, UserProfile, AppConfig } from './types';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { EntryForm } from './components/EntryForm';
import { BulkEntry } from './components/BulkEntry';
import { DTRTable } from './components/DTRTable';
import { ExportActions } from './components/ExportActions';
import { cn } from './utils/helpers';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('dtr_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [entries, setEntries] = useState<DTREntry[]>(() => {
    const saved = localStorage.getItem('dtr_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('dtr_config');
    return saved ? JSON.parse(saved) : {
      targetHours: 120,
      theme: 'light',
      timeFormat: '12h'
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'single' | 'bulk' | 'reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<DTREntry | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('dtr_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('dtr_config', JSON.stringify(config));
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('dtr_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dtr_user');
    }
  }, [user]);

  const handleAddEntry = (entry: DTREntry) => {
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? entry : e));
      setEditingEntry(null);
    } else {
      setEntries(prev => [...prev, entry]);
    }
    setActiveTab('dashboard');
  };

  const handleAddMultiple = (newEntries: DTREntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
    setActiveTab('dashboard');
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const loadSampleData = () => {
    const sampleEntries: DTREntry[] = [];
    const startDate = new Date('2024-02-01');
    
    for (let i = 0; i < 15; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      sampleEntries.push({
        id: crypto.randomUUID(),
        date: d.toISOString().split('T')[0],
        timeIn: '07:00',
        timeOut: '17:00',
        breakMinutes: 60,
        isOvertime: i % 5 === 0,
        overtimeReason: i % 5 === 0 ? 'Urgent Task' : '',
        remarks: 'Sample OJT Work',
        type: 'regular',
        totalHours: 9.0,
      });
    }
    setEntries(sampleEntries);
    setActiveTab('dashboard');
  };

  const filteredEntries = entries.filter(e => 
    e.remarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.date.includes(searchQuery)
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'single', label: 'Single Entry', icon: PlusCircle },
    { id: 'bulk', label: 'Bulk Entry', icon: Layers },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar / Navigation */}
      <nav className="w-full sm:w-64 bg-white dark:bg-slate-900 border-b sm:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-6 z-20">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Clock size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">DTR Tracker</h1>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingEntry(null);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Auth user={user} onLogin={setUser} onLogout={() => setUser(null)} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'dashboard' ? 'Welcome back! Here is your OJT progress.' : `Manage your ${activeTab} records.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search records..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }))}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-500 transition-colors"
            >
              {config.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <Dashboard entries={entries} config={config} />
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Database className="text-blue-500" size={20} />
                    Recent Records
                  </h3>
                  <ExportActions entries={entries} user={user} config={config} />
                </div>
                <DTRTable 
                  entries={filteredEntries} 
                  onDelete={handleDeleteEntry} 
                  onEdit={(e) => {
                    setEditingEntry(e);
                    setActiveTab('single');
                  }} 
                />
              </div>
            )}

            {activeTab === 'single' && (
              <div className="max-w-2xl mx-auto">
                <EntryForm onAdd={handleAddEntry} initialData={editingEntry || undefined} />
              </div>
            )}

            {activeTab === 'bulk' && (
              <div className="max-w-3xl mx-auto">
                <BulkEntry onAddMultiple={handleAddMultiple} />
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
                  <FileText className="mx-auto text-blue-500 mb-4" size={48} />
                  <h3 className="text-2xl font-bold mb-2">Generate Reports</h3>
                  <p className="text-slate-500 mb-6">Download your DTR summary for supervisor signature or personal backup.</p>
                  <div className="flex justify-center">
                    <ExportActions entries={entries} user={user} config={config} />
                  </div>
                </div>
                <DTRTable 
                  entries={filteredEntries} 
                  onDelete={handleDeleteEntry} 
                  onEdit={(e) => {
                    setEditingEntry(e);
                    setActiveTab('single');
                  }} 
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <SettingsIcon className="text-slate-500" size={20} />
                    App Settings
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Target OJT Hours</p>
                        <p className="text-xs text-slate-500">Default is 120 hours for most programs.</p>
                      </div>
                      <input 
                        type="number" 
                        value={config.targetHours}
                        onChange={e => setConfig({ ...config, targetHours: parseInt(e.target.value) })}
                        className="w-24 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Time Format</p>
                        <p className="text-xs text-slate-500">Choose how times are displayed.</p>
                      </div>
                      <select 
                        value={config.timeFormat}
                        onChange={e => setConfig({ ...config, timeFormat: e.target.value as any })}
                        className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="font-bold text-red-600 mb-4">Danger Zone</h4>
                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => {
                            if (confirm('Clear all DTR records? This cannot be undone.')) {
                              setEntries([]);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all"
                        >
                          <Trash2 size={16} /> Clear All Data
                        </button>
                        <button 
                          onClick={loadSampleData}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-all"
                        >
                          <Info size={16} /> Load Sample Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {user && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <User className="text-blue-500" size={20} />
                      OJT Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Supervisor Name</label>
                        <input 
                          type="text" 
                          value={user.supervisorName || ''}
                          onChange={e => setUser({ ...user, supervisorName: e.target.value })}
                          placeholder="Enter supervisor name"
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        />
                      </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                        <input 
                          type="text" 
                          value={user.department || ''}
                          onChange={e => setUser({ ...user, department: e.target.value })}
                          placeholder="Enter department"
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Training Category</label>
                        <select 
                          value={user.trainingCategory || ''}
                          onChange={e => setUser({ ...user, trainingCategory: e.target.value })}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        >
                          <option value="">Select Category</option>
                          <option value="IT/Software">IT/Software</option>
                          <option value="Admin/HR">Admin/HR</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
          <p>OJT DTR Tracker - 120 Hour Edition</p>
          <p className="mt-1">Built for OJT Students with ❤️</p>
        </footer>
      </main>
    </div>
  );
}
