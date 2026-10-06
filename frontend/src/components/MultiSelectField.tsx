import { Autocomplete, Checkbox, TextField } from '@mui/material'
import { useState } from 'react'

interface MultiSelectFieldProps {
  label: string
  /** Known choices; names not in the list can still be typed and added with Enter. */
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  onBlur: () => void
  loading?: boolean
  /** The choices failed to load; typing names still works. */
  loadFailed?: boolean
  error?: string
}

/**
 * Picks any number of names from a list, with a checkbox per choice. A typed name that matches
 * a choice in any capitalization uses the choice's spelling, so "latex" selects "Latex".
 */
export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  onBlur,
  loading,
  loadFailed,
  error,
}: MultiSelectFieldProps) {
  const [inputValue, setInputValue] = useState('')

  function normalize(names: string[]) {
    const byKey = new Map<string, string>()
    for (const name of names.map((name) => name.trim()).filter(Boolean)) {
      const key = name.toLowerCase()
      if (!byKey.has(key)) {
        byKey.set(key, options.find((option) => option.toLowerCase() === key) ?? name)
      }
    }
    return [...byKey.values()]
  }

  return (
    <Autocomplete
      multiple
      freeSolo
      disableCloseOnSelect
      options={options}
      value={value}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, text) => setInputValue(text)}
      onChange={(_, names) => onChange(normalize(names))}
      // A typed name is added on blur too, so it isn't lost when the user moves on without Enter.
      // (MUI's autoSelect would instead pick the highlighted option, which in a multi-select
      // deselects it if it was already chosen.)
      onBlur={() => {
        if (inputValue.trim()) onChange(normalize([...value, inputValue]))
        setInputValue('')
        onBlur()
      }}
      renderOption={({ key, ...props }, option, { selected }) => (
        <li key={key} {...props}>
          <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0 }} />
          {option}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Select or type to add"
          error={Boolean(error)}
          helperText={
            error ??
            (loadFailed
              ? "Couldn't load the list of choices; you can still type names."
              : undefined)
          }
        />
      )}
    />
  )
}
