import { MenuItem, TextField } from '@mui/material'
import { isThemeName, THEME_NAMES, useThemeName, type ThemeName } from '../theme'

const LABELS: Record<ThemeName, string> = { light: 'Light', dark: 'Dark' }

export function ThemePicker() {
  const { themeName, setThemeName } = useThemeName()
  return (
    <TextField
      select
      label="Theme"
      value={themeName}
      onChange={(event) => isThemeName(event.target.value) && setThemeName(event.target.value)}
      sx={{ minWidth: 120 }}
    >
      {THEME_NAMES.map((name) => (
        <MenuItem key={name} value={name}>
          {LABELS[name]}
        </MenuItem>
      ))}
    </TextField>
  )
}
