const createTheme = ({
  name,
  hex,
  primaryStrong,
  primaryDark,
  primarySoft,
  primarySoft2,
  rgb,
}) => ({
  name,
  hex,
  primary: hex,
  primaryStrong,
  primaryDark,
  primarySoft,
  primarySoft2,
  focusRing: `rgba(${rgb}, 0.2)`,
  gradientStart: `rgba(${rgb}, 0.14)`,
  gradientEnd: `rgba(${rgb}, 0.06)`,
  darkBg: `rgba(${rgb}, 0.22)`,
  darkBg2: `rgba(${rgb}, 0.12)`,
});

// Multicolor theme configuration
export const THEMES = {
  graphite: createTheme({ name: 'Graphite', hex: '#374151', primaryStrong: '#1f2937', primaryDark: '#111827', primarySoft: '#e5e7eb', primarySoft2: '#f3f4f6', rgb: '55, 65, 81' }),
  cloudstandard: createTheme({ name: 'Cloud Standard', hex: '#111111', primaryStrong: '#000000', primaryDark: '#000000', primarySoft: '#f5f5f5', primarySoft2: '#ffffff', rgb: '47, 126, 254' }),
};

export const THEME_COLORS = Object.keys(THEMES);

export const DEFAULT_THEME = 'graphite';

