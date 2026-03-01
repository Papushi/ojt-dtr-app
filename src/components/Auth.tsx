import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  user: UserProfile | null;
}

declare global {
  interface Window {
    google: any;
  }
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onLogout, user }) => {
  useEffect(() => {
    /* global google */
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Fallback for demo
        callback: handleCredentialResponse,
      });

      if (!user) {
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", shape: "pill" }
        );
      }
    }
  }, [user]);

  const handleCredentialResponse = (response: any) => {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const newUser: UserProfile = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
    onLogin(newUser);
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 pr-4 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
        <img 
          src={user.picture} 
          alt={user.name} 
          className="w-10 h-10 rounded-full border-2 border-blue-500"
          referrerPolicy="no-referrer"
        />
        <div className="hidden sm:block">
          <p className="text-sm font-semibold leading-none">{user.name}</p>
          <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="google-signin-btn"></div>
      <p className="text-xs text-slate-400">Sign in to sync your DTR records</p>
    </div>
  );
};
