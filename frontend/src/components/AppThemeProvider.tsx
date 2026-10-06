import { CssBaseline, ThemeProvider } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { isThemeName, THEMES, ThemeNameContext, type ThemeName } from '../theme'

const STORAGE_KEY = 'theme'

// A saved choice wins; otherwise follow the operating system's light or dark preference.
function initialThemeName(): ThemeName {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (isThemeName(saved)) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState(initialThemeName)

  function chooseTheme(name: ThemeName) {
    setThemeName(name)
    localStorage.setItem(STORAGE_KEY, name)
  }

  return (
    <ThemeNameContext value={{ themeName, setThemeName: chooseTheme }}>
      <ThemeProvider theme={THEMES[themeName]}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeNameContext>
  )
}
