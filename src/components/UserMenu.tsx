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
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{ color: '#e2e8f0' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
          <User className="w-4 h-4" style={{ color: '#8b5cf6' }} />
        </div>
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {name}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: '#94a3b8' }}
        />
      </button>

      {open && (
        <div
          className="fp-glass-sm"
          style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, minWidth: 200, padding: '8px 0', zIndex: 100 }}
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="w-full text-left"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, color: '#94a3b8', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', borderRadius: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
            role="menuitem"
          >
            <LogOut className="w-4 h-4" style={{ color: 'inherit' }} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
