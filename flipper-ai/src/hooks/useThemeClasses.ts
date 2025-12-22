import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook to generate theme-aware CSS classes
 */
export function useThemeClasses() {
  const { theme } = useTheme();
  const { colors } = theme;

  return {
    // Primary button/action classes
    primaryButton: `bg-gradient-to-r from-${colors.primaryFrom} to-${colors.primaryTo} hover:from-${colors.primaryFrom.replace('500', '600')} hover:to-${colors.primaryTo.replace('600', '700')} shadow-lg shadow-${colors.primaryShadow} hover:shadow-${colors.primaryShadow.replace('/50', '/80')}`,
    
    // Secondary button classes
    secondaryButton: `bg-gradient-to-r from-${colors.secondaryFrom} to-${colors.secondaryTo} shadow-lg shadow-${colors.secondaryShadow}`,
    
    // Background gradient orbs
    orb1: `bg-${colors.orbColors[0]}`,
    orb2: `bg-${colors.orbColors[1]}`,
    orb3: `bg-${colors.orbColors[2]}`,
    
    // Text gradient
    textGradient: `bg-gradient-to-r from-${colors.textGradient.from} via-${colors.textGradient.via} to-${colors.textGradient.to} bg-clip-text text-transparent`,
    
    // Muted text
    textMuted: `text-${colors.textMuted}`,
    
    // Accent cards
    accentBlue: `bg-gradient-to-br from-${colors.accentBlue.from} to-${colors.accentBlue.to} shadow-lg shadow-${colors.accentBlue.shadow}`,
    accentGreen: `bg-gradient-to-br from-${colors.accentGreen.from} to-${colors.accentGreen.to} shadow-lg shadow-${colors.accentGreen.shadow}`,
    accentOrange: `bg-gradient-to-br from-${colors.accentOrange.from} to-${colors.accentOrange.to} shadow-lg shadow-${colors.accentOrange.shadow}`,
    accentPurple: `bg-gradient-to-br from-${colors.accentPurple.from} to-${colors.accentPurple.to} shadow-lg shadow-${colors.accentPurple.shadow}`,
    
    // Hover effects for accent cards
    accentBlueHover: `hover:shadow-${colors.accentBlue.shadow.replace('/50', '/80')}`,
    accentGreenHover: `hover:shadow-${colors.accentGreen.shadow.replace('/50', '/80')}`,
    accentOrangeHover: `hover:shadow-${colors.accentOrange.shadow.replace('/50', '/80')}`,
    accentPurpleHover: `hover:shadow-${colors.accentPurple.shadow.replace('/50', '/80')}`,
    
    // Raw color values for inline styles
    colors,
  };
}

