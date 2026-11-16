import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthProps {
  onLogout: () => void;
  user: UserProfile | null;
}

export const Auth: React.FC<AuthProps> = ({ onLogout, user }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user?.picture]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  if (!user) return null;

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
      <div className="flex items-center gap-2.5 min-w-0">
        {user.picture && !imgError ? (
          <img
            src={user.picture}
            alt={user.name}
            onError={() => setImgError(true)}
            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
            {getInitials(user.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {user.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {user.email}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
        title="Sign Out"
        aria-label="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};
