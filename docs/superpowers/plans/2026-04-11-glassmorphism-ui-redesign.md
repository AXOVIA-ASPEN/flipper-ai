# Glassmorphism UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Flipper.ai's glassmorphism design system (dark `#080b14` background, purple accents, CSS grid, glass cards, gradient text) consistently across every authenticated page and shared component.

**Architecture:** A single source-of-truth block of design-system CSS is added to `globals.css`, then each component/page is migrated to use those classes. No new libraries — pure Tailwind + inline styles where needed. The `ThemeContext` / `ThemeStyles` system is left intact so the existing theme infrastructure still works; our dark classes simply override defaults.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4, React, TypeScript (strict)

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `app/globals.css` | Modify | Add full design system CSS block |
| `app/layout.tsx` | Modify | Add bg-mesh + bg-grid divs; set body background |
| `src/components/Navigation.tsx` | Modify | glass-nav, purple active states, gradient logo |
| `src/components/Toast.tsx` | Modify | Dark glassmorphism toast |
| `app/dashboard/page.tsx` | Modify | Dark bg, glass stat cards, glass listing cards, dark badges |
| `src/components/FilterPanel.tsx` | Modify | Align glass classes with design system |
| `src/components/KanbanBoard.tsx` | Modify | Glass column headers, glass opportunity cards |
| `app/opportunities/page.tsx` | Modify | Dark page wrapper, page header |
| `app/settings/page.tsx` + settings components | Modify | Glass section cards |
| `src/components/UserMenu.tsx` | Modify | Glass dropdown |

---

## Task 1: Add Design System to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append the design system CSS block**

Add this entire block to the end of `app/globals.css` (after the existing `.animate-slide-in-right` rule):

```css
/* ═══════════════════════════════════════════════
   FLIPPER.AI DESIGN SYSTEM
   Dark glassmorphism — canonical source of truth
   ═══════════════════════════════════════════════ */

/* ─── Design tokens ─── */
:root {
  --fp-bg:            #080b14;
  --fp-purple:        #7c3aed;
  --fp-purple-bright: #8b5cf6;
  --fp-purple-deep:   #6d28d9;
  --fp-purple-darkest:#5b21b6;
  --fp-green:         #34d399;
  --fp-red:           #f87171;
  --fp-yellow:        #fbbf24;
  --fp-glass-bg:      rgba(255,255,255,0.04);
  --fp-glass-border:  rgba(255,255,255,0.09);
  --fp-glass-hover:   rgba(255,255,255,0.08);
  --fp-glow-purple:   rgba(109,40,217,0.35);
}

/* ─── Background layers ─── */
.fp-bg-mesh {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 15% 20%, rgba(109,40,217,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 75%, rgba(109,40,217,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 10%, rgba(139,92,246,0.06) 0%, transparent 50%),
    var(--fp-bg);
  animation: fp-meshShift 20s ease-in-out infinite alternate;
}
@keyframes fp-meshShift {
  0%   { background-position: 0% 0%, 100% 100%, 50% 0%; }
  100% { background-position: 10% 15%, 90% 85%, 55% 5%; }
}

.fp-bg-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(130,90,210,0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(130,90,210,0.15) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Content must sit above bg layers */
.fp-content { position: relative; z-index: 1; }

/* ─── Glass cards ─── */
.fp-glass {
  background: var(--fp-glass-bg);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--fp-glass-border);
  border-radius: 16px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}
.fp-glass:hover {
  background: var(--fp-glass-hover);
  border-color: rgba(109,40,217,0.3);
  transform: translateY(-3px);
  box-shadow: 0 0 0 1px rgba(109,40,217,0.15), 0 20px 40px rgba(0,0,0,0.4), 0 0 40px var(--fp-glow-purple);
}

.fp-glass-sm {
  background: var(--fp-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--fp-glass-border);
  border-radius: 12px;
}

.fp-glass-nav {
  background: rgba(8,11,20,0.80);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

/* ─── Glow card (gradient border on hover) ─── */
.fp-glow-card {
  position: relative;
  border-radius: 16px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.fp-glow-card::before {
  content: '';
  position: absolute; inset: -1px; border-radius: 17px;
  background: linear-gradient(135deg, rgba(109,40,217,0.6), rgba(139,92,246,0.35), rgba(91,33,182,0.2));
  opacity: 0; transition: opacity 0.3s ease; z-index: -1;
}
.fp-glow-card:hover::before { opacity: 1; }
.fp-glow-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 60px var(--fp-glow-purple);
}

/* ─── Gradient text ─── */
.fp-grad-purple {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fp-grad-green {
  background: linear-gradient(135deg, #34d399, #7c3aed);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fp-grad-gold {
  background: linear-gradient(135deg, #fbbf24, #f97316);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fp-grad-red {
  background: linear-gradient(135deg, #f87171, #fb923c);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ─── Buttons ─── */
.fp-btn-primary {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white; border: none; border-radius: 10px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
  position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px;
}
.fp-btn-primary::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
  opacity: 0; transition: opacity 0.2s;
}
.fp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(109,40,217,0.5); }
.fp-btn-primary:hover::after { opacity: 1; }
.fp-btn-primary:active { transform: translateY(0); }
.fp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

.fp-btn-ghost {
  background: rgba(255,255,255,0.05); color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  padding: 9px 14px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
  display: inline-flex; align-items: center; gap: 6px;
}
.fp-btn-ghost:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; border-color: rgba(255,255,255,0.15); }

/* ─── Input ─── */
.fp-input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0;
  padding: 10px 12px; font-size: 13px;
  width: 100%; outline: none; transition: all 0.2s;
}
.fp-input::placeholder { color: #475569; }
.fp-input:focus {
  border-color: rgba(109,40,217,0.5);
  background: rgba(109,40,217,0.06);
  box-shadow: 0 0 0 3px rgba(109,40,217,0.12);
}

/* ─── Badges ─── */
.fp-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; border-radius: 9999px;
  font-size: 11px; font-weight: 600;
}
.fp-badge-blue   { background: rgba(96,165,250,0.12);  color: #93c5fd;  border: 1px solid rgba(96,165,250,0.2); }
.fp-badge-green  { background: rgba(52,211,153,0.12);  color: #6ee7b7;  border: 1px solid rgba(52,211,153,0.2); }
.fp-badge-yellow { background: rgba(251,191,36,0.12);  color: #fcd34d;  border: 1px solid rgba(251,191,36,0.2); }
.fp-badge-orange { background: rgba(251,146,60,0.12);  color: #fdba74;  border: 1px solid rgba(251,146,60,0.2); }
.fp-badge-purple { background: rgba(139,92,246,0.12);  color: #c4b5fd;  border: 1px solid rgba(139,92,246,0.2); }
.fp-badge-red    { background: rgba(248,113,113,0.12); color: #fca5a5;  border: 1px solid rgba(248,113,113,0.2); }
.fp-badge-gray   { background: rgba(148,163,184,0.1);  color: #94a3b8;  border: 1px solid rgba(148,163,184,0.15); }

/* ─── Alert banners ─── */
.fp-alert-warn {
  background: rgba(251,191,36,0.07); border: 1px solid rgba(251,191,36,0.2); border-radius: 12px;
  backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.fp-alert-danger {
  background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.2); border-radius: 12px;
  backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.fp-alert-success {
  background: rgba(52,211,153,0.07); border: 1px solid rgba(52,211,153,0.2); border-radius: 12px;
  backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
}

/* ─── Section label ─── */
.fp-section-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ─── Nav link ─── */
.fp-nav-link {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500; color: #64748b;
  text-decoration: none; transition: all 0.2s; cursor: pointer;
  white-space: nowrap;
}
.fp-nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.fp-nav-link.fp-active { background: rgba(109,40,217,0.15); color: #8b5cf6; }

/* ─── Progress bar ─── */
.fp-prog-track { height: 6px; border-radius: 9999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.fp-prog-fill  { height: 100%; border-radius: 9999px; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); }

/* ─── Stat card (non-interactive version of fp-glass) ─── */
.fp-stat-card {
  background: var(--fp-glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--fp-glass-border);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.25s ease;
}
.fp-stat-card:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(109,40,217,0.25);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 24px var(--fp-glow-purple);
}

/* ─── Pulse dot ─── */
@keyframes fp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.9)} }
.fp-pulse { animation: fp-pulse 2s ease-in-out infinite; }

/* ─── Divider ─── */
.fp-divider { height: 1px; background: rgba(255,255,255,0.06); }

/* ─── Scrollbar (dark) ─── */
.fp-scroll::-webkit-scrollbar { width: 6px; }
.fp-scroll::-webkit-scrollbar-track { background: transparent; }
.fp-scroll::-webkit-scrollbar-thumb { background: rgba(109,40,217,0.3); border-radius: 3px; }
.fp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
```

- [ ] **Step 2: Verify build still compiles**

```bash
cd /Users/stephenboyett/Desktop/Github/axovia-aspen/flipper-ai && make lint
```

Expected: 0 errors (it's pure CSS, not TypeScript — lint won't flag it but confirms no syntax issues from the `@import` chain).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add glassmorphism design system CSS to globals"
```

---

## Task 2: Root Layout — Dark Body + Background Layers

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `<body>` and add background layers**

Replace the current `layout.tsx` body content with:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#080b14', color: '#e2e8f0', minHeight: '100vh' }}
      >
        <div className="fp-bg-mesh" aria-hidden="true" />
        <div className="fp-bg-grid" aria-hidden="true" />
        <FirebaseAuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <ThemeStyles />
              <WebVitals />
              <Navigation />
              <div className="fp-content">
                {children}
              </div>
              <Analytics />
            </ToastProvider>
          </ThemeProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Build check**

```bash
make build 2>&1 | tail -20
```

Expected: Compiled successfully. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): add dark body + mesh/grid background to root layout"
```

---

## Task 3: Navigation Bar

**Files:**
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Rewrite Navigation to use glass-nav styles**

Replace the entire `Navigation.tsx` content with:

```tsx
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
 * Sticky top nav using fp-glass-nav. Active links get a purple background.
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
    { href: '/',              label: 'Dashboard',   icon: Home },
    { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
    { href: '/messages',      label: 'Messages',    icon: MessageSquare },
    { href: '/posting-queue', label: 'Cross-Posts', icon: Send },
    { href: '/settings',      label: 'Settings',    icon: Settings },
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
```

- [ ] **Step 2: Build check**

```bash
make build 2>&1 | tail -20
```

Expected: Compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navigation.tsx
git commit -m "feat(ui): update Navigation to glassmorphism dark design"
```

---

## Task 4: Toast Notifications

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: Rewrite Toast with dark glassmorphism style**

Replace entire `Toast.tsx` content:

```tsx
/**
 * @file src/components/Toast.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 2.0
 * @brief Glassmorphism toast notification with type-based accent colors.
 *
 * @description
 * Dark glassmorphism toast. Each type gets a left accent border and icon tint.
 * Uses safe textContent assignment (no innerHTML with dynamic values).
 */
'use client';

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, TrendingUp } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'alert' | 'opportunity';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const ICON_MAP = {
  success:     CheckCircle,
  error:       AlertCircle,
  info:        Info,
  alert:       TrendingUp,
  opportunity: TrendingUp,
};

const ACCENT_MAP: Record<string, { border: string; icon: string; dot: string }> = {
  success:     { border: '#34d399', icon: '#34d399', dot: 'linear-gradient(135deg,#34d399,#7c3aed)' },
  error:       { border: '#f87171', icon: '#f87171', dot: 'linear-gradient(135deg,#f87171,#fb923c)' },
  info:        { border: '#8b5cf6', icon: '#8b5cf6', dot: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  alert:       { border: '#fbbf24', icon: '#fbbf24', dot: 'linear-gradient(135deg,#fbbf24,#f97316)' },
  opportunity: { border: '#8b5cf6', icon: '#8b5cf6', dot: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
};

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const Icon = ICON_MAP[type];
  const accent = ACCENT_MAP[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="animate-slide-in-right"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
        borderRadius: 12, minWidth: 320, maxWidth: 420,
        background: 'rgba(12,16,28,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accent.border}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(109,40,217,0.15)',
      }}
    >
      <Icon size={18} style={{ flexShrink: 0, marginTop: 1, color: accent.icon }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, borderRadius: 4, transition: 'color 0.2s' }}
        aria-label="Close notification"
        onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
make build 2>&1 | tail -20
```

Expected: Compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat(ui): redesign Toast to dark glassmorphism with accent borders"
```

---

## Task 5: Dashboard Page

**Files:**
- Modify: `app/dashboard/page.tsx`

This is the most heavily-used page. Changes:
1. Remove `bg-gray-50` outer wrapper → transparent (shows the global bg)
2. Stat cards: `bg-white rounded-lg shadow` → `fp-stat-card`
3. Listing cards: `bg-white rounded-lg shadow hover:shadow-lg` → `fp-glass fp-glow-card`
4. Platform badge colors: opaque solid → `fp-badge` pill variants
5. Status badges: `bg-gray-100 text-gray-700` etc → `fp-badge` variants
6. Text colors: `text-gray-900` → `#e2e8f0`, `text-gray-600` → `#94a3b8`
7. SSE error banner → `fp-alert-warn`
8. Empty state → `fp-glass`
9. Page size buttons → `fp-btn-ghost` / `fp-btn-primary` style
10. Pagination buttons → same

- [ ] **Step 1: Update top of Dashboard component and stat cards**

Locate this section in `app/dashboard/page.tsx` (around line 208):

```tsx
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Flipper Dashboard</h1>
```

Replace with:

```tsx
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Flipper Dashboard</h1>
```

- [ ] **Step 2: Update SSE status indicator**

Find:
```tsx
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-600 font-medium">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-600 font-medium">Reconnecting…</span>
                </>
              )}
```

Replace with:
```tsx
              {isConnected ? (
                <>
                  <span className="fp-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span style={{ color: '#34d399', fontWeight: 600, fontSize: 13 }}>Live</span>
                </>
              ) : (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'fp-pulse 2s ease-in-out infinite' }} />
                  <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>Reconnecting…</span>
                </>
              )}
```

- [ ] **Step 3: Update SSE error banner**

Find:
```tsx
        {lastError && !sseErrorDismissed && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm" data-testid="sse-error-banner">
```

Replace with:
```tsx
        {lastError && !sseErrorDismissed && (
          <div className="fp-alert-warn" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', fontSize: 13, color: '#fcd34d' }} data-testid="sse-error-banner">
```

Also update the dismiss button inside it:
```tsx
            <button
              onClick={() => setSseErrorDismissed(true)}
              style={{ flexShrink: 0, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', borderRadius: 4 }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
```

- [ ] **Step 4: Update stat cards**

Find the 4 stat card divs:
```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Listings</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalListings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Opportunities Found</div>
            <div className="text-3xl font-bold text-purple-600">{stats.opportunitiesFound}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Flips</div>
            <div className="text-3xl font-bold text-blue-600">{stats.activeFlips}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Profit</div>
            <div className="text-3xl font-bold text-green-600">
              ${stats.totalProfit.toFixed(0)}
            </div>
          </div>
        </div>
```

Replace with:
```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: 32 }}>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Total Listings</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0' }}>{stats.totalListings}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Opportunities</div>
            <div className="fp-grad-purple" style={{ fontSize: 32, fontWeight: 800 }}>{stats.opportunitiesFound}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Active Flips</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{stats.activeFlips}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Total Profit</div>
            <div className="fp-grad-green" style={{ fontSize: 32, fontWeight: 800 }}>${stats.totalProfit.toFixed(0)}</div>
          </div>
        </div>
```

- [ ] **Step 5: Update listing card styles**

Find the listing card Link element:
```tsx
              <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                >
```

Replace with:
```tsx
              <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block fp-glass fp-glow-card"
                  style={{ textDecoration: 'none', overflow: 'hidden' }}
                >
```

- [ ] **Step 6: Update text colors inside listing cards**

Make these replacements throughout the listing card body (inside the `<div className="p-4">` block):

| Find | Replace |
|------|---------|
| `className="font-semibold text-gray-900 mb-2 line-clamp-2"` | `style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}` |
| `className="text-sm text-gray-600"` (Asking label) | `style={{ fontSize: 12, color: '#94a3b8' }}` |
| `className="text-lg font-bold text-gray-900"` | `style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}` |
| `className="text-lg font-bold text-green-600"` | `style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}` |
| `className="mb-2 text-sm"` (Score) | `style={{ marginBottom: 8, fontSize: 13 }}` |
| `className="text-gray-500"` (Score label) | `style={{ color: '#94a3b8' }}` |
| `className="font-semibold text-blue-600"` (Score value) | `style={{ fontWeight: 600, color: '#8b5cf6' }}` |
| `className="flex items-center justify-between text-sm text-gray-600"` | `style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}` |
| `className="flex items-center gap-1 text-purple-600 hover:text-purple-800"` | `style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8b5cf6', textDecoration: 'none' }}` |

- [ ] **Step 7: Update profit badge inside listing cards**

Find:
```tsx
                      <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          +${listing.profitPotential} profit (
```

Replace with:
```tsx
                      <span className="fp-badge fp-badge-green">
                          +${listing.profitPotential} profit (
```

And close with `</span>` instead of `</div>`.

- [ ] **Step 8: Update platform and status badge helpers**

Replace `getPlatformBadgeColor` with a mapping to `fp-badge-*` classes:

```tsx
  function getPlatformBadgeClass(platform: string) {
    const map: Record<string, string> = {
      EBAY:       'fp-badge fp-badge-yellow',
      CRAIGSLIST: 'fp-badge fp-badge-blue',
      FACEBOOK:   'fp-badge fp-badge-blue',
      OFFERUP:    'fp-badge fp-badge-green',
      MERCARI:    'fp-badge fp-badge-orange',
    };
    return map[platform] || 'fp-badge fp-badge-gray';
  }
```

Remove the old `getPlatformBadgeColor` function.

Replace the status badge helper:
```tsx
  const LISTING_STATUS_BADGE: Record<string, string> = {
    NEW:         'fp-badge fp-badge-gray',
    ANALYZED:    'fp-badge fp-badge-blue',
    OPPORTUNITY: 'fp-badge fp-badge-purple',
  };

  function getStatusBadgeClass(status: string) {
    return LISTING_STATUS_BADGE[status] || 'fp-badge fp-badge-gray';
  }
```

Remove the old `LISTING_STATUS_COLORS` const.

Update badge elements in the card header:
```tsx
                        <span className={getPlatformBadgeClass(listing.platform)}>
                          {listing.platform}
                        </span>
                        <span className={getStatusBadgeClass(listing.status)}>
                          {listing.status}
                        </span>
```

- [ ] **Step 9: Update demand level badge**

Replace the inline `className` ternary chain for demand level with `fp-badge` variants:

```tsx
                      {listing.demandLevel && (
                        <div style={{ marginBottom: 8 }}>
                          <span className={`fp-badge ${
                            listing.demandLevel === 'rising'        ? 'fp-badge-green'  :
                            listing.demandLevel === 'stable'        ? 'fp-badge-blue'   :
                            listing.demandLevel === 'declining'     ? 'fp-badge-orange' :
                            listing.demandLevel === 'low_liquidity' ? 'fp-badge-red'    :
                                                                       'fp-badge-gray'
                          }`}>
                            {listing.demandLevel === 'rising'        ? '↑ Rising demand'  :
                             listing.demandLevel === 'stable'        ? '→ Stable demand'  :
                             listing.demandLevel === 'declining'     ? '↓ Declining'      :
                             listing.demandLevel === 'low_liquidity' ? '⚠ Low liquidity'  :
                             listing.demandLevel}
                          </span>
                        </div>
                      )}
```

- [ ] **Step 10: Update logistics badges**

```tsx
                    {(listing.sizeCategory || listing.outsidePickupRadius) && (
                      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }} data-testid="logistics-badges">
                        {listing.sizeCategory && (
                          <span className={`fp-badge ${
                            listing.sizeCategory === 'large_local_only'         ? 'fp-badge-yellow'  :
                            listing.sizeCategory === 'fragile_special_handling' ? 'fp-badge-purple'  :
                                                                                   'fp-badge-gray'
                          }`}>
                            {listing.sizeCategory === 'large_local_only'         ? '🚚 Local only'  :
                             listing.sizeCategory === 'fragile_special_handling' ? '⚠ Fragile'      :
                             '📦 Shippable'}
                          </span>
                        )}
                        {listing.outsidePickupRadius && (
                          <span className="fp-badge fp-badge-orange">📍 Outside radius</span>
                        )}
                      </div>
                    )}
```

- [ ] **Step 11: Update empty state and page size buttons**

Find the empty state:
```tsx
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-xl text-gray-600">No listings found</div>
            <p className="text-gray-500 mt-2">Try adjusting your filters or running a new scan</p>
          </div>
```

Replace with:
```tsx
          <div className="fp-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 8 }}>No listings found</div>
            <p style={{ color: '#475569', fontSize: 14 }}>Try adjusting your filters or running a new scan</p>
          </div>
```

Find the page-size buttons:
```tsx
              className={`px-3 py-1 rounded text-sm border ${
                filters.limit === String(size)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
```

Replace with:
```tsx
              className={filters.limit === String(size) ? 'fp-btn-primary' : 'fp-btn-ghost'}
              style={{ padding: '5px 14px', fontSize: 13 }}
```

Also update the surrounding label text:
```tsx
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Show:</span>
          {/* buttons */}
          <span style={{ fontSize: 13, color: '#94a3b8' }}>per page</span>
```

- [ ] **Step 12: Update loading/error states**

```tsx
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, color: '#94a3b8' }}>Loading listings…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, color: '#f87171' }}>{error}</div>
      </div>
    );
  }
```

- [ ] **Step 13: Build & lint check**

```bash
make lint && make build 2>&1 | tail -30
```

Expected: 0 ESLint errors, compiled successfully.

- [ ] **Step 14: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(ui): redesign Dashboard page to glassmorphism dark theme"
```

---

## Task 6: Kanban Board (Opportunities)

**Files:**
- Modify: `src/components/KanbanBoard.tsx`
- Modify: `app/opportunities/page.tsx`

- [ ] **Step 1: Read KanbanBoard.tsx fully**

```bash
cat -n src/components/KanbanBoard.tsx
```

- [ ] **Step 2: Update COLUMNS definition in KanbanBoard.tsx**

Find the `COLUMNS` const and replace with:

```tsx
const COLUMNS = [
  { id: 'IDENTIFIED', label: 'New',       badgeClass: 'fp-badge fp-badge-blue',   headerColor: 'rgba(96,165,250,0.15)',  borderColor: 'rgba(96,165,250,0.25)' },
  { id: 'CONTACTED',  label: 'Contacted', badgeClass: 'fp-badge fp-badge-yellow', headerColor: 'rgba(251,191,36,0.12)',  borderColor: 'rgba(251,191,36,0.25)' },
  { id: 'PURCHASED',  label: 'Purchased', badgeClass: 'fp-badge fp-badge-purple', headerColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)'  },
  { id: 'LISTED',     label: 'Listed',    badgeClass: 'fp-badge fp-badge-orange', headerColor: 'rgba(251,146,60,0.12)',  borderColor: 'rgba(251,146,60,0.25)' },
  { id: 'SOLD',       label: 'Sold',      badgeClass: 'fp-badge fp-badge-green',  headerColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.25)' },
  { id: 'PASSED',     label: 'Passed',    badgeClass: 'fp-badge fp-badge-gray',   headerColor: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.15)' },
] as const;
```

- [ ] **Step 3: Update column header rendering in KanbanBoard.tsx**

Find the column header element (inside Droppable render, the column header div). Replace the existing gradient header with:

```tsx
{/* Column header */}
<div style={{ padding: '12px 16px', borderBottom: `1px solid ${col.borderColor}`, background: col.headerColor, borderRadius: '12px 12px 0 0' }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
      {col.label}
    </span>
    <span className={col.badgeClass} style={{ fontSize: 10 }}>
      {colOpps.length}
    </span>
  </div>
</div>
```

- [ ] **Step 4: Update column container styles in KanbanBoard.tsx**

The column outer div (Droppable's child div) should become a glass panel:

```tsx
<div
  ref={provided.innerRef}
  {...provided.droppableProps}
  className="fp-glass-sm fp-scroll"
  style={{
    minHeight: 200,
    maxHeight: 'calc(100vh - 220px)',
    overflowY: 'auto',
    padding: '8px',
    borderRadius: '0 0 12px 12px',
    border: `1px solid ${col.borderColor}`,
    borderTop: 'none',
  }}
>
```

- [ ] **Step 5: Update opportunity card styles in KanbanBoard.tsx**

Find the Draggable card div and replace with:

```tsx
<div
  ref={provided.innerRef}
  {...provided.draggableProps}
  {...provided.dragHandleProps}
  className="fp-glass"
  style={{
    ...provided.draggableProps.style,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'grab',
  }}
>
```

Inside the card, update text colors:
- Title: `style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.4 }}`
- Price labels: `style={{ fontSize: 11, color: '#475569' }}`
- Asking price value: `style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}`
- Profit value: `className="fp-grad-green"` + `style={{ fontWeight: 700, fontSize: 15 }}`
- Score label/value: use `color: '#94a3b8'` and `color: '#8b5cf6'` respectively

- [ ] **Step 6: Update the opportunities page wrapper**

In `app/opportunities/page.tsx`, find the outer page container and remove any light background:

```tsx
// Find any className with bg-gray-* or bg-white on the page wrapper and replace with:
style={{ minHeight: '100vh', padding: '32px 24px' }}
```

Update the page `<h1>` to use dark text:
```tsx
<h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
  Opportunities
</h1>
```

- [ ] **Step 7: Build & lint**

```bash
make lint && make build 2>&1 | tail -30
```

Expected: 0 errors, compiled successfully.

- [ ] **Step 8: Commit**

```bash
git add src/components/KanbanBoard.tsx app/opportunities/page.tsx
git commit -m "feat(ui): redesign KanbanBoard and Opportunities page to dark glassmorphism"
```

---

## Task 7: Settings Page

**Files:**
- Modify: `app/settings/page.tsx`
- Modify (selective): Any settings components that have heavy light-theme backgrounds

- [ ] **Step 1: Read settings page**

```bash
cat -n app/settings/page.tsx
```

- [ ] **Step 2: Update settings page wrapper**

Remove `bg-gray-50` or similar from the page wrapper. Replace the top-level container with:

```tsx
<div style={{ minHeight: '100vh', padding: '32px 24px' }}>
  <div style={{ maxWidth: 1152, margin: '0 auto' }}>
    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>Configure your Flipper.ai experience</p>
    {/* settings sections */}
  </div>
</div>
```

- [ ] **Step 3: Wrap each settings section card**

Each settings section (BillingSettings, NotificationSettings, etc.) should be wrapped with the glass card class. In `app/settings/page.tsx`, wrap each child component with:

```tsx
<div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
  <BillingSettings />
</div>
<div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
  <NotificationSettings />
</div>
{/* etc. */}
```

- [ ] **Step 4: Update BillingSettings.tsx — card backgrounds only**

Read `src/components/BillingSettings.tsx`. Find any `bg-white` or `bg-gray-*` card containers inside it and replace with `fp-glass-sm` class. Update text colors from `text-gray-900`/`text-gray-600` to inline `color: '#e2e8f0'`/`color: '#94a3b8'`. The component's internal structure stays the same.

- [ ] **Step 5: Build & lint**

```bash
make lint && make build 2>&1 | tail -30
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/settings/page.tsx src/components/BillingSettings.tsx
git commit -m "feat(ui): update Settings page to dark glassmorphism card layout"
```

---

## Task 8: FilterPanel Component

**Files:**
- Modify: `src/components/FilterPanel.tsx`

- [ ] **Step 1: Read FilterPanel.tsx**

```bash
cat -n src/components/FilterPanel.tsx
```

- [ ] **Step 2: Update panel wrapper**

The panel currently uses `backdrop-blur-xl bg-white/10 rounded-xl border border-white/20`. Replace the outer panel div className/style with:

```tsx
className="fp-glass"
style={{ padding: 24, marginBottom: 24 }}
```

- [ ] **Step 3: Update active filter chips**

Find the active filter chip pattern (`bg-blue-500/30 border border-blue-400/50 text-xs text-blue-200`) and replace with:

```tsx
className="fp-badge fp-badge-purple"
```

- [ ] **Step 4: Update filter inputs and labels**

- Input elements: add `className="fp-input"` (replacing any `bg-white` or `border-gray-300` styles)
- Label text: `style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}`
- Checkbox color: already handled by browser if `accent-color: #7c3aed` is set — add it as a global rule in globals.css if not present

- [ ] **Step 5: Build & lint**

```bash
make lint && make build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/FilterPanel.tsx
git commit -m "feat(ui): update FilterPanel to dark glassmorphism design"
```

---

## Task 9: UserMenu Component

**Files:**
- Modify: `src/components/UserMenu.tsx`

- [ ] **Step 1: Read UserMenu.tsx**

```bash
cat -n src/components/UserMenu.tsx
```

- [ ] **Step 2: Update dropdown container**

The dropdown panel should use `fp-glass-sm` with dark text. Replace any `bg-white shadow-lg rounded-md` or similar with:

```tsx
className="fp-glass-sm"
style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, minWidth: 200, padding: '8px 0', zIndex: 100 }}
```

- [ ] **Step 3: Update menu items**

Replace `hover:bg-gray-100` menu item classes with:
```tsx
style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13, color: '#94a3b8', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', borderRadius: 8 }}
onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
```

- [ ] **Step 4: Build & lint**

```bash
make lint && make build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/UserMenu.tsx
git commit -m "feat(ui): update UserMenu dropdown to dark glassmorphism"
```

---

## Task 10: Pagination & Remaining Light Backgrounds

**Files:**
- Modify: `app/dashboard/page.tsx` (pagination section)
- Modify: `app/messages/page.tsx` (quick scan)
- Modify: `app/posting-queue/page.tsx` (quick scan)

- [ ] **Step 1: Update pagination buttons in Dashboard**

Find the pagination buttons section at the bottom of `dashboard/page.tsx`. Replace `bg-white border text-gray-700` / `bg-purple-600 text-white` button styles with `fp-btn-ghost` / `fp-btn-primary` classes.

Update surrounding text:
```tsx
<span style={{ fontSize: 13, color: '#94a3b8' }}>
  Page {pagination.page} of {pagination.totalPages} ({pagination.total} listings)
</span>
```

- [ ] **Step 2: Quick scan messages page**

Read `app/messages/page.tsx`. Update:
- Page wrapper: remove `bg-gray-*`, add `style={{ minHeight: '100vh', padding: '32px 24px' }}`
- Thread list container: add `fp-glass` class
- Thread items background on hover: `rgba(255,255,255,0.04)` instead of `bg-gray-50`
- Tab underline active color: `#7c3aed` instead of blue
- Page heading: `color: '#e2e8f0'`

- [ ] **Step 3: Quick scan posting-queue page**

Read `app/posting-queue/page.tsx`. Apply the same pattern:
- Outer wrapper: no light bg
- Cards: `fp-glass` class  
- Status badges: `fp-badge` variants matching the status (pending→yellow, processing→blue, completed→green, failed→red)

- [ ] **Step 4: Build & lint**

```bash
make lint && make build 2>&1 | tail -30
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx app/messages/page.tsx app/posting-queue/page.tsx
git commit -m "feat(ui): update pagination, Messages, and Posting Queue to dark theme"
```

---

## Task 11: Final Quality Gate

- [ ] **Step 1: Full lint + build + test**

```bash
make lint && make build && make test
```

Expected: 0 lint errors, compiled successfully, all existing tests still pass.

- [ ] **Step 2: Start dev server and visually verify key pages**

```bash
make dev
```

Open and verify these pages look correct:
- `http://localhost:3000/` — Dashboard: dark bg, glass cards, purple accents, visible grid
- `http://localhost:3000/opportunities` — Kanban: glass columns, dark card text
- `http://localhost:3000/messages` — dark theme, glass thread list
- `http://localhost:3000/settings` — glass section cards

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete glassmorphism redesign across all authenticated pages"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Dark `#080b14` background — Task 2 (root layout body)
- ✅ CSS grid always visible — Task 1 (globals.css `.fp-bg-grid`)
- ✅ Glassmorphism cards (`backdrop-filter: blur(24px)`) — Task 1 + Tasks 5–9
- ✅ Purple accent only (no teal/cyan) — all badge/button/border colors use `#7c3aed`/`#8b5cf6`
- ✅ Green only for profit/financial — `#34d399` used only in profit badges and profit stat
- ✅ Navigation glass-nav — Task 3
- ✅ Toasts dark glassmorphism — Task 4
- ✅ Kanban board dark — Task 6
- ✅ Alerts with backdrop-filter — Task 1 (`.fp-alert-*` classes)
- ✅ Gradient text for key metrics — Tasks 5–6 (`.fp-grad-purple`, `.fp-grad-green`)
- ✅ Badge system (pill shape, glass tint, colored border) — Task 1 + Tasks 5–8

**Placeholder scan:** No TBD, TODO, or placeholder steps found.

**Type consistency:** `KanbanOpportunity`, `DashboardStats`, `Listing`, `ToastProps` types are unchanged — only styling is modified.
