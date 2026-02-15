/**
 * @jest-environment jsdom
 */

/**
 * Tests for useThemeClasses hook
 * @author Stephen Boyett
 */

import { renderHook } from "@testing-library/react";

// Mock ThemeContext
const mockColors = {
  primaryFrom: "blue-500",
  primaryTo: "purple-600",
  primaryShadow: "blue-500/50",
  secondaryFrom: "gray-700",
  secondaryTo: "gray-800",
  secondaryShadow: "gray-900/50",
  orbColors: ["blue-500/30", "purple-500/20", "cyan-500/20"],
  textGradient: { from: "blue-400", via: "purple-400", to: "pink-400" },
  textMuted: "gray-400",
  accentBlue: { from: "blue-500/20", to: "blue-600/10", shadow: "blue-500/50" },
  accentGreen: { from: "green-500/20", to: "green-600/10", shadow: "green-500/50" },
  accentOrange: { from: "orange-500/20", to: "orange-600/10", shadow: "orange-500/50" },
  accentPurple: { from: "purple-500/20", to: "purple-600/10", shadow: "purple-500/50" },
};

jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: { colors: mockColors } }),
}));

import { useThemeClasses } from "@/hooks/useThemeClasses";

describe("useThemeClasses", () => {
  it("returns primary button classes with gradient", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.primaryButton).toContain("bg-gradient-to-r");
    expect(result.current.primaryButton).toContain("blue-500");
  });

  it("returns secondary button classes", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.secondaryButton).toContain("bg-gradient-to-r");
  });

  it("returns orb classes from theme", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.orb1).toContain("blue-500/30");
    expect(result.current.orb2).toContain("purple-500/20");
    expect(result.current.orb3).toContain("cyan-500/20");
  });

  it("returns text gradient classes", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.textGradient).toContain("bg-clip-text");
    expect(result.current.textGradient).toContain("text-transparent");
  });

  it("returns accent card classes for all colors", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.accentBlue).toContain("bg-gradient-to-br");
    expect(result.current.accentGreen).toContain("bg-gradient-to-br");
    expect(result.current.accentOrange).toContain("bg-gradient-to-br");
    expect(result.current.accentPurple).toContain("bg-gradient-to-br");
  });

  it("returns hover classes with increased shadow opacity", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.accentBlueHover).toContain("/80");
    expect(result.current.accentGreenHover).toContain("/80");
  });

  it("exposes raw colors object", () => {
    const { result } = renderHook(() => useThemeClasses());
    expect(result.current.colors).toBe(mockColors);
  });
});
