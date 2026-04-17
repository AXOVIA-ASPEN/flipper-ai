/**
 * @file src/components/ui/ScoreRing.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief SVG score ring with color tier based on numeric score.
 *
 * @description
 * Renders an SVG donut ring sized to `size` px. The ring fill colour resolves by
 * score tier: green (#34d399) ≥80, yellow (#fbbf24) 60–79, red (#f87171) <60.
 * NaN / out-of-range scores are clamped to 0. The `scoreColor` helper is exported
 * separately so unit tests can exercise the boundary matrix without rendering.
 *
 * Geometry matches the flipper-frontend skill reference:
 *   r = size/2 − 4, circumference = 2πr, fill = (score/100)·circumference
 *   SVG rotated −90° so fill starts at 12 o'clock.
 */

'use client';

import React from 'react';

export function scoreColor(score: number): '#34d399' | '#fbbf24' | '#f87171' {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  if (s >= 80) return '#34d399';
  if (s >= 60) return '#fbbf24';
  return '#f87171';
}

export interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function ScoreRing({
  score,
  size = 48,
  strokeWidth = 3,
  showLabel = true,
  className,
  'data-testid': testId = 'score-ring',
}: ScoreRingProps): React.JSX.Element {
  const clamped = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const fill = (clamped / 100) * circumference;
  const color = scoreColor(clamped);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      data-testid={testId}
      role="img"
      aria-label={`AI confidence score ${clamped} out of 100`}
      width={size}
      height={size}
      className={className}
      style={{ transform: 'rotate(-90deg)', display: 'block' }}
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Foreground fill */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circumference}`}
      />
      {showLabel && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.25}
          fontWeight={600}
          fill="#e2e8f0"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          {clamped}
        </text>
      )}
    </svg>
  );
}
