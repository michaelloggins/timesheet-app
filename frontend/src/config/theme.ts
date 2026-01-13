/**
 * MiraVista Custom Theme
 * Brand colors and styling for MiraVista Diagnostics
 */

import {
  createLightTheme,
  createDarkTheme,
  BrandVariants,
  Theme,
} from '@fluentui/react-components';

// MiraVista Brand Colors
// Primary: Forest Green #286f1f
// Accent: Olive Green #85b43b
// Secondary: Bright Blue #2ea3f2

const miraVistaBrand: BrandVariants = {
  10: '#020401',
  20: '#0f1b0c',
  30: '#162c12',
  40: '#1b3a16',
  50: '#20491a',
  60: '#24581d',
  70: '#286721',
  80: '#2c7724',
  90: '#308728',
  100: '#34972b',
  110: '#38a82f',
  120: '#5cb848',
  130: '#7dc766',
  140: '#9dd586',
  150: '#bce3a7',
  160: '#dbf1c9',
};

export const miraVistaLightTheme: Theme = {
  ...createLightTheme(miraVistaBrand),
  // Custom overrides for a more engaging look
  colorBrandBackground: '#286f1f',
  colorBrandBackground2: '#e8f5e3',
  colorBrandBackground2Hover: '#d4eec9',
  colorBrandBackground2Pressed: '#c0e7af',
  colorBrandForeground1: '#286f1f',
  colorBrandForeground2: '#1a4a14',
  colorBrandForegroundLink: '#2ea3f2',
  colorBrandForegroundLinkHover: '#1e8ad2',
  colorBrandStroke1: '#286f1f',
  colorBrandStroke2: '#85b43b',
  // Accent colors for a fun, engaging look
  colorPaletteGreenBackground1: '#e8f5e3',
  colorPaletteGreenBackground2: '#d4eec9',
  colorPaletteGreenBackground3: '#85b43b',
  colorPaletteGreenForeground1: '#1a5c13',
  colorPaletteGreenForeground2: '#286f1f',
  colorPaletteGreenForeground3: '#34972b',
  colorPaletteGreenBorderActive: '#286f1f',
};

export const miraVistaDarkTheme: Theme = {
  ...createDarkTheme(miraVistaBrand),
  colorBrandForegroundLink: '#5cc8ff',
  colorBrandForegroundLinkHover: '#8dd8ff',
};

// Export brand color constants for direct use
export const brandColors = {
  primaryGreen: '#286f1f',
  accentGreen: '#85b43b',
  lightGreen: '#e8f5e3',
  blue: '#2ea3f2',
  darkText: '#404041',
  lightText: '#666666',
  white: '#ffffff',
  lightGray: '#f3f3f3',
};
