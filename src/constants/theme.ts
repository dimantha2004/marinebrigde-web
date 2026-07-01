import { createTheme } from '@mui/material/styles';

/**
 * MarineBridge design system — "Maritime-industrial".
 * Deep ocean authority meets operational precision.
 * Ported from the mobile app's constants/theme.ts.
 */
export const palette = {
  navyDeep: '#0A1628', // primary background, headers
  oceanMid: '#1B3A5C', // cards, panels
  steelBlue: '#2E6DA4', // primary action, links
  signalAmber: '#F59E0B', // pending / approval states
  engineGreen: '#10B981', // success, delivered, approved
  alertRed: '#EF4444', // rejected, declined, critical
  fogWhite: '#F0F4F8', // text on dark
  hullGray: '#64748B', // secondary text, borders
  surfaceVariant: '#15304D',
} as const;

export const fonts = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/**
 * MUI dark theme built from the maritime palette. Mirrors the React Native Paper
 * MD3 override used on mobile (constants/theme.ts → paperTheme).
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: palette.steelBlue, contrastText: palette.fogWhite },
    secondary: { main: palette.signalAmber, contrastText: palette.navyDeep },
    success: { main: palette.engineGreen },
    warning: { main: palette.signalAmber },
    error: { main: palette.alertRed },
    background: { default: palette.navyDeep, paper: palette.oceanMid },
    text: { primary: palette.fogWhite, secondary: palette.hullGray },
    divider: 'rgba(100, 116, 139, 0.32)',
  },
  shape: { borderRadius: radius.md },
  typography: {
    fontFamily: fonts.body,
    h1: { fontFamily: fonts.display, fontWeight: 700 },
    h2: { fontFamily: fonts.display, fontWeight: 700 },
    h3: { fontFamily: fonts.display, fontWeight: 700 },
    h4: { fontFamily: fonts.display, fontWeight: 700 },
    h5: { fontFamily: fonts.display, fontWeight: 600 },
    h6: { fontFamily: fonts.display, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.oceanMid,
          border: `1px solid ${palette.surfaceVariant}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: radius.sm } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: palette.navyDeep, backgroundImage: 'none' },
      },
    },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
  },
});

export type AppTheme = typeof muiTheme;
