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
  blackwhite: createTheme({ name: 'Black & White', hex: '#111111', primaryStrong: '#000000', primaryDark: '#050505', primarySoft: '#f5f5f5', primarySoft2: '#fafafa', rgb: '17, 17, 17' }),
  graphite: createTheme({ name: 'Graphite', hex: '#6b7280', primaryStrong: '#4b5563', primaryDark: '#374151', primarySoft: '#eef2f7', primarySoft2: '#f7f9fc', rgb: '107, 114, 128' }),
  ultralight: createTheme({ name: 'Ultra Light', hex: '#e5e7eb', primaryStrong: '#d1d5db', primaryDark: '#9ca3af', primarySoft: '#fafafa', primarySoft2: '#ffffff', rgb: '229, 231, 235' }),
  indigo: createTheme({ name: 'Indigo', hex: '#4f46e5', primaryStrong: '#4338ca', primaryDark: '#312e81', primarySoft: '#e0e7ff', primarySoft2: '#eef2ff', rgb: '79, 70, 229' }),
  violet: createTheme({ name: 'Violet', hex: '#7c3aed', primaryStrong: '#6d28d9', primaryDark: '#5b21b6', primarySoft: '#ede9fe', primarySoft2: '#f5f3ff', rgb: '124, 58, 237' }),
  purple: createTheme({ name: 'Purple', hex: '#a855f7', primaryStrong: '#9333ea', primaryDark: '#7e22ce', primarySoft: '#f3e8ff', primarySoft2: '#faf5ff', rgb: '168, 85, 247' }),
  fuchsia: createTheme({ name: 'Fuchsia', hex: '#d946ef', primaryStrong: '#c026d3', primaryDark: '#86198f', primarySoft: '#fae8ff', primarySoft2: '#fdf4ff', rgb: '217, 70, 239' }),
  pink: createTheme({ name: 'Pink', hex: '#ec4899', primaryStrong: '#db2777', primaryDark: '#9d174d', primarySoft: '#fce7f3', primarySoft2: '#fdf2f8', rgb: '236, 72, 153' }),
  rose: createTheme({ name: 'Rose', hex: '#f43f5e', primaryStrong: '#e11d48', primaryDark: '#9f1239', primarySoft: '#ffe4e6', primarySoft2: '#fff1f2', rgb: '244, 63, 94' }),
  red: createTheme({ name: 'Red', hex: '#ef4444', primaryStrong: '#dc2626', primaryDark: '#991b1b', primarySoft: '#fee2e2', primarySoft2: '#fef2f2', rgb: '239, 68, 68' }),
  orange: createTheme({ name: 'Orange', hex: '#f97316', primaryStrong: '#ea580c', primaryDark: '#9a3412', primarySoft: '#ffedd5', primarySoft2: '#fff7ed', rgb: '249, 115, 22' }),
  amber: createTheme({ name: 'Amber', hex: '#f59e0b', primaryStrong: '#d97706', primaryDark: '#92400e', primarySoft: '#fef3c7', primarySoft2: '#fffbeb', rgb: '245, 158, 11' }),
  yellow: createTheme({ name: 'Yellow', hex: '#eab308', primaryStrong: '#ca8a04', primaryDark: '#854d0e', primarySoft: '#fef9c3', primarySoft2: '#fefce8', rgb: '234, 179, 8' }),
  lime: createTheme({ name: 'Lime', hex: '#84cc16', primaryStrong: '#65a30d', primaryDark: '#3f6212', primarySoft: '#ecfccb', primarySoft2: '#f7fee7', rgb: '132, 204, 22' }),
  green: createTheme({ name: 'Green', hex: '#22c55e', primaryStrong: '#16a34a', primaryDark: '#14532d', primarySoft: '#dcfce7', primarySoft2: '#f0fdf4', rgb: '34, 197, 94' }),
  emerald: createTheme({ name: 'Emerald', hex: '#10b981', primaryStrong: '#059669', primaryDark: '#065f46', primarySoft: '#d1fae5', primarySoft2: '#ecfdf5', rgb: '16, 185, 129' }),
  teal: createTheme({ name: 'Teal', hex: '#14b8a6', primaryStrong: '#0d9488', primaryDark: '#115e59', primarySoft: '#ccfbf1', primarySoft2: '#f0fdfa', rgb: '20, 184, 166' }),
  cyan: createTheme({ name: 'Cyan', hex: '#06b6d4', primaryStrong: '#0891b2', primaryDark: '#164e63', primarySoft: '#cffafe', primarySoft2: '#ecfeff', rgb: '6, 182, 212' }),
  sky: createTheme({ name: 'Sky', hex: '#0ea5e9', primaryStrong: '#0284c7', primaryDark: '#0c4a6e', primarySoft: '#e0f2fe', primarySoft2: '#f0f9ff', rgb: '14, 165, 233' }),
  blue: createTheme({ name: 'Blue', hex: '#3b82f6', primaryStrong: '#2563eb', primaryDark: '#1e3a8a', primarySoft: '#dbeafe', primarySoft2: '#eff6ff', rgb: '59, 130, 246' }),
  slate: createTheme({ name: 'Slate', hex: '#64748b', primaryStrong: '#475569', primaryDark: '#1e293b', primarySoft: '#e2e8f0', primarySoft2: '#f1f5f9', rgb: '100, 116, 139' }),
};

export const THEME_COLORS = Object.keys(THEMES);

export const DEFAULT_THEME = 'indigo';

