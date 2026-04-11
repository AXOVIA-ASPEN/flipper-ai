'use client';

/**
 * @file src/components/Navigation.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 2.0
 * @brief Top navigation bar with glassmorphism design.
 *
 * @description
 * Sticky top nav using fp-glass-nav. Active links use purple tint.
 * Shows an unread message badge. Fetches unread count on every route change.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, TrendingUp, MessageSquare, Send } from 'lucide-react';
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
    { href: '/',              label: 'Dashboard',    icon: Home },
    { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
    { href: '/messages',      label: 'Messages',     icon: MessageSquare },
    { href: '/posting-queue', label: 'Cross-Posts',  icon: Send },
    { href: '/settings',      label: 'Settings',     icon: Settings },
  ];

  return (
    <nav className="fp-glass-nav sticky top-0 z-50">
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'white', boxShadow: '0 0 16px rgba(124,58,237,0.4)', flexShrink: 0 }}>
            F
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: '#e2e8f0' }}>
            Flipper<span className="fp-grad-purple">.ai</span>
          </span>
        </Link>

        {/* Nav links + user menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fp-nav-link${isActive ? ' fp-active' : ''}`}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{item.label}</span>
                {item.href === '/messages' && unreadCount > 0 && (
                  <span
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 4px', fontSize: 10, fontWeight: 700, color: 'white', background: '#7c3aed', borderRadius: 9999 }}
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
    </nav>
  );
}
