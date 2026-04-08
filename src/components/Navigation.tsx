'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, TrendingUp, MessageSquare } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

export default function Navigation() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/messages/threads?limit=100')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) {
          const total = (json.data as { unreadCount: number }[]).reduce(
            (sum, t) => sum + (t.unreadCount || 0),
            0
          );
          setUnreadCount(total);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🐧</span>
            <span>Flipper AI</span>
          </Link>

          {/* Navigation Links + User menu (with Log out) */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.href === '/messages' && unreadCount > 0 && (
                    <span
                      className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-blue-600 rounded-full"
                      aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
