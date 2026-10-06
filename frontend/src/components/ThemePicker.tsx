import { MenuItem, TextField } from '@mui/material'
import { capitalize } from '../format'
import { isThemeName, THEME_NAMES, useThemeName } from '../theme'

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
          {capitalize(name)}
        </MenuItem>
      ))}
    </TextField>
  )
}
