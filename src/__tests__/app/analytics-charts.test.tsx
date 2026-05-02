/**
 * @file src/__tests__/app/analytics-charts.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Unit tests for analytics page Recharts series colors (Story 14.9 AC #1, ADR-14.9-A).
 *
 * @description
 * Recharts series colors are stored as literal hex strings on `<Line stroke=…>` and
 * `<Bar fill=…>` props (Recharts has no className API for series elements — see ADR-14.9-F).
 * This test scans the analytics page source for those literal hex values and asserts every
 * stroke/fill is in the canonical-token allowlist. Also asserts that all three Recharts
 * components apply the canonical `contentStyle.background` Tooltip styling per pre-mortem
 * P-3 — guards against the "Tooltip applied to one chart, missed on the other two" regression.
 */

import * as fs from 'fs';
import * as path from 'path';

const ANALYTICS_PAGE = path.resolve(__dirname, '../../../app/analytics/page.tsx');

const CANONICAL_TOKENS = ['#34d399', '#7c3aed', '#8b5cf6', '#c4b5fd', '#a78bfa', '#f87171', '#fca5a5', '#fbbf24', '#94a3b8'];

describe('analytics page Recharts series colors (Story 14.9 AC #1)', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(ANALYTICS_PAGE, 'utf-8');
  });

  it('all canonical color constants used by Recharts series are in the allowlist', () => {
    // Every series-color JSX identifier must resolve to a canonical token. The page
    // declares them as module-level constants at the top of the file; we extract those
    // declarations and assert each maps to a canonical hex.
    const constRe = /const (PROFIT_GREEN|PURPLE_PRIMARY|PURPLE_TERTIARY|DANGER_RED|TEXT_SECONDARY)\s*=\s*['"](#[0-9a-fA-F]{6})['"]/g;
    const matches = [...source.matchAll(constRe)];
    expect(matches.length).toBeGreaterThanOrEqual(4);
    matches.forEach((m) => {
      expect(CANONICAL_TOKENS).toContain(m[2].toLowerCase());
    });
  });

  it('Recharts <Line>/<Bar> series wire stroke/fill props to canonical color constants', () => {
    // Every <Line stroke=…/> and <Bar fill=…/> must reference one of the canonical token names.
    const seriesProps = [
      ...source.matchAll(/<(Line|Bar)\b[^/]*?(?:stroke|fill)=\{(\w+)\}/g),
    ];
    expect(seriesProps.length).toBeGreaterThanOrEqual(5);
    const allowed = new Set(['PROFIT_GREEN', 'PURPLE_PRIMARY', 'PURPLE_TERTIARY', 'DANGER_RED']);
    seriesProps.forEach((m) => {
      expect(allowed.has(m[2])).toBe(true);
    });
  });

  it('Trends LineChart "profit" line uses canonical profit-green (#34d399) per FR-UI-DESIGN-04', () => {
    // The profit line uses the PROFIT_GREEN token. Look for the comment+constant pattern.
    expect(source).toContain('PROFIT_GREEN');
    expect(source).toMatch(/PROFIT_GREEN\s*=\s*['"]#34d399['"]/);
    // The profit series is wired to PROFIT_GREEN
    expect(source).toMatch(/dataKey="profit"[^>]*stroke=\{PROFIT_GREEN\}/);
  });

  it('Trends LineChart "revenue" line uses purple primary (#7c3aed) per AC #1', () => {
    expect(source).toMatch(/PURPLE_PRIMARY\s*=\s*['"]#7c3aed['"]/);
    expect(source).toMatch(/dataKey="revenue"[^>]*stroke=\{PURPLE_PRIMARY\}/);
  });

  it('Tooltip canonical contentStyle is applied to every <Tooltip> (pre-mortem P-3)', () => {
    const tooltipCount = (source.match(/<Tooltip/g) || []).length;
    const contentStyleApplications = (source.match(/contentStyle=\{TOOLTIP_CONTENT_STYLE\}/g) || []).length;
    // Story 14.9 ships exactly three charts (Trends LineChart, Profit-by-Category BarChart,
    // Platform Performance BarChart). Pinning the count surfaces accidental drift if a chart
    // is added/removed without updating the contentStyle wiring.
    expect(tooltipCount).toBe(3);
    expect(contentStyleApplications).toBe(tooltipCount);
  });

  it('TOOLTIP_CONTENT_STYLE constant uses the canonical glass-tooltip background', () => {
    expect(source).toMatch(/TOOLTIP_BG\s*=\s*['"]rgba\(15,\s*23,\s*42,\s*0\.95\)['"]/);
  });

  it('CartesianGrid uses the canonical divider tint', () => {
    expect(source).toMatch(/stroke=\{GRID_LINE\}/);
    expect(source).toMatch(/GRID_LINE\s*=\s*['"]rgba\(255,\s*255,\s*255,\s*0\.06\)['"]/);
  });

  it('XAxis and YAxis use the canonical secondary text color', () => {
    expect(source).toMatch(/<XAxis[^>]+stroke=\{TEXT_SECONDARY\}/);
    expect(source).toMatch(/<YAxis[^>]+stroke=\{TEXT_SECONDARY\}/);
    expect(source).toMatch(/TEXT_SECONDARY\s*=\s*['"]#94a3b8['"]/);
  });

  it('mounted gate is preserved per pre-mortem P-1 (Recharts hydration safety)', () => {
    expect(source).toMatch(/const \[mounted, setMounted\] = useState\(false\)/);
    expect(source).toMatch(/setMounted\(true\)/);
    // The `mounted ? <ResponsiveContainer …> : <LoadingSkeleton />` gate stays
    expect(source).toMatch(/mounted \? \(\s*<ResponsiveContainer/);
  });
});
