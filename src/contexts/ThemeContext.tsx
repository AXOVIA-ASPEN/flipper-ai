"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Theme, themes, defaultTheme } from "@/lib/theme-config";

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem("flipper-theme");
    if (savedThemeId && themes[savedThemeId]) {
      setThemeState(themes[savedThemeId]);
    }
  }, []);

  const setTheme = (themeId: string) => {
    if (themes[themeId]) {
      setThemeState(themes[themeId]);
      localStorage.setItem("flipper-theme", themeId);
    }
  };

  const availableThemes = Object.values(themes);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

