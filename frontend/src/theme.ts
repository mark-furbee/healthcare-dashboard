// Styling approach: every visual decision lives in this file, as MUI theme options (palette,
// typography, shape, and component defaults). Components use the sx prop only for layout, with
// theme spacing units and palette keys, so there are no CSS files and no raw colors elsewhere.
// Because all styling goes through the theme, the light and dark themes apply everywhere without
// per-component dark-mode code.

import { createTheme, type PaletteOptions, type Theme, type ThemeOptions } from '@mui/material'
import { createContext, useContext } from 'react'

export const THEME_NAMES = ['light', 'dark'] as const
export type ThemeName = (typeof THEME_NAMES)[number]

export const isThemeName = (value: unknown): value is ThemeName =>
  THEME_NAMES.includes(value as ThemeName)

// Brand colors.
const BLUE = '#002bba'
const VIOLET = '#d4c1ff'
// The brand violet reads at only about 1.5:1 on cream, so light-theme links use a deeper shade.
const DEEP_VIOLET = '#5c34b2'
const INK = '#121212'
const CREAM = '#f6f4f1'
const GREY = '#9b9b9b'
const WARM_GREY = '#5e5a56'

// The brand blue is too dark to read on dark backgrounds, so the dark theme leads with violet.
// Secondary is the link color: violet, darkened in the light theme for contrast.
const PALETTES: Record<ThemeName, PaletteOptions> = {
  light: {
    mode: 'light',
    primary: { main: BLUE },
    secondary: { main: DEEP_VIOLET },
    background: { default: CREAM, paper: '#ffffff' },
    text: { primary: INK, secondary: WARM_GREY },
  },
  dark: {
    mode: 'dark',
    primary: { main: VIOLET },
    secondary: { main: VIOLET },
    background: { default: INK, paper: '#1c1c1c' },
    text: { primary: CREAM, secondary: GREY },
  },
}

// Shared by both themes: only the palette differs between them.
const BASE: ThemeOptions = {
  // Inter is self-hosted (see main.tsx), so no request leaves for a font CDN.
  typography: {
    fontFamily: '"Inter Variable", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  // Defaults chosen once here instead of repeated as props: a compact density suited to a data-heavy
  // dashboard, flat buttons, outlined surfaces, and violet links.
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiChip: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiLink: { defaultProps: { color: 'secondary' } },
    MuiTable: { defaultProps: { size: 'small' } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
}

export const THEMES = Object.fromEntries(
  THEME_NAMES.map((name) => [name, createTheme({ ...BASE, palette: PALETTES[name] })]),
) as Record<ThemeName, Theme>

export const ThemeNameContext = createContext<{
  themeName: ThemeName
  setThemeName: (name: ThemeName) => void
}>({ themeName: 'light', setThemeName: () => {} })

export const useThemeName = () => useContext(ThemeNameContext)
