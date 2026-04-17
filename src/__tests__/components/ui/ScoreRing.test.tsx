/**
 * @file src/__tests__/components/ui/ScoreRing.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit tests for the ScoreRing shared component.
 *
 * @description
 * Tests the scoreColor boundary matrix, SVG structure, clamping logic, label
 * visibility, and accessibility attributes.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScoreRing, scoreColor } from '@/components/ui/ScoreRing';

describe('scoreColor', () => {
  it.each([
    [0,   '#f87171'],
    [59,  '#f87171'],
    [60,  '#fbbf24'],
    [79,  '#fbbf24'],
    [80,  '#34d399'],
    [100, '#34d399'],
  ])('scoreColor(%i) returns %s', (score, expected) => {
    expect(scoreColor(score)).toBe(expected);
  });

  it('treats NaN as 0 → red', () => {
    expect(scoreColor(NaN)).toBe('#f87171');
  });

  it('clamps negative score to 0 → red', () => {
    expect(scoreColor(-10)).toBe('#f87171');
  });

  it('clamps score > 100 to 100 → green', () => {
    expect(scoreColor(150)).toBe('#34d399');
  });
});

describe('ScoreRing', () => {
  it('renders an svg root with role=img and aria-label containing the clamped score', () => {
    render(<ScoreRing score={82} />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'AI confidence score 82 out of 100');
  });

  it('clamps score above 100 to 100', () => {
    render(<ScoreRing score={150} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'AI confidence score 100 out of 100');
  });

  it('clamps score below 0 to 0', () => {
    render(<ScoreRing score={-5} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'AI confidence score 0 out of 100');
  });

  it('clamps NaN to 0', () => {
    render(<ScoreRing score={NaN} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'AI confidence score 0 out of 100');
  });

  it('renders the numeric label when showLabel is true (default)', () => {
    const { container } = render(<ScoreRing score={75} />);
    const textEl = container.querySelector('text');
    expect(textEl).toBeInTheDocument();
    expect(textEl?.textContent).toBe('75');
  });

  it('omits the numeric label when showLabel is false', () => {
    const { container } = render(<ScoreRing score={75} showLabel={false} />);
    expect(container.querySelector('text')).not.toBeInTheDocument();
  });

  it('renders two <circle> elements — background track + fill', () => {
    const { container } = render(<ScoreRing score={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
  });

  it('foreground circle stroke matches scoreColor for given score', () => {
    const { container } = render(<ScoreRing score={82} />);
    const circles = container.querySelectorAll('circle');
    const fillCircle = circles[1];
    expect(fillCircle).toHaveAttribute('stroke', '#34d399');
  });

  it('defaults data-testid to "score-ring"', () => {
    render(<ScoreRing score={50} />);
    expect(screen.getByTestId('score-ring')).toBeInTheDocument();
  });
});
