'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

const LOGIN_PATH = '/login';
const LOGGED_OUT_PARAM = 'loggedOut=true';

export default function UserMenu() {
  const { user, loading, signOut } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    await signOut();
    window.location.href = `${LOGIN_PATH}?${LOGGED_OUT_PARAM}`;
  }

  if (loading || !user) {
    return null;
  }

  const name = user.displayName ?? user.email ?? 'Account';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-48 py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
