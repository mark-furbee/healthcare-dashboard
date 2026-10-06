import { Button, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type SubmitEvent } from 'react'
import { api } from '../api'
import { formatDateTime, toDateTimeInputValue } from '../format'
import { notesQuery, queryKeys } from '../queries'
import { ErrorAlert } from './ErrorAlert'
import { Section } from './Section'

// Matches the API's limit; the count appears as a note nears it.
const MAX_NOTE_LENGTH = 5000
const SHOW_COUNT_FROM = 4500
const CLOCK_TICK_MS = 30_000

const formatCount = (count: number) => count.toLocaleString('en-US')

/** The current time as a datetime-local value, kept up to date while the page is open. */
function useNow() {
  const [now, setNow] = useState(() => toDateTimeInputValue(new Date()))
  useEffect(() => {
    const timer = setInterval(() => setNow(toDateTimeInputValue(new Date())), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}

export function PatientNotes({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  // null until the user picks a time; the field then shows, and the note gets, the current time.
  const [time, setTime] = useState<string | null>(null)
  const now = useNow()
  // The API trims notes before checking their length.
  const length = content.trim().length
  const tooLong = length > MAX_NOTE_LENGTH
  const notes = useQuery(notesQuery(patientId))
  // Notes feed the summary, so refresh everything cached under this patient.
  const refreshPatient = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) })

  const createNote = useMutation({
    // An unchanged time is left to the server, so a form left open still records when it was sent.
    mutationFn: () =>
      api.createNote(patientId, content.trim(), time ? new Date(time).toISOString() : undefined),
    onSuccess: () => {
      setContent('')
      setTime(null)
      return refreshPatient()
    },
  })
  const deleteNote = useMutation({
    mutationFn: (noteId: number) => api.deleteNote(patientId, noteId),
    onSuccess: refreshPatient,
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    createNote.mutate()
  }

  return (
    <Section title="Clinical notes">
      <Stack component="form" onSubmit={handleSubmit} spacing={1}>
        <TextField
          label="New note"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          multiline
          minRows={2}
          // No hard cap on the input: a pasted note would be cut off without warning.
          error={tooLong}
          helperText={
            tooLong
              ? `Notes must be ${formatCount(MAX_NOTE_LENGTH)} characters or fewer (currently ${formatCount(length)})`
              : length >= SHOW_COUNT_FROM
                ? `${formatCount(length)} / ${formatCount(MAX_NOTE_LENGTH)}`
                : undefined
          }
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
        >
          <TextField
            type="datetime-local"
            label="Time"
            value={time ?? now}
            onChange={(event) => setTime(event.target.value || null)}
            helperText={time ? 'Clear to use the current time' : 'Defaults to now'}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: now } }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!length || tooLong || createNote.isPending}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'flex-start' } }}
          >
            Add note
          </Button>
        </Stack>
      </Stack>
      {createNote.isError && <ErrorAlert error={createNote.error} />}
      {deleteNote.isError && <ErrorAlert error={deleteNote.error} />}
      {notes.isError && <ErrorAlert error={notes.error} onRetry={() => notes.refetch()} />}
      {notes.data?.length === 0 && <Typography color="text.secondary">No notes yet.</Typography>}
      <List>
        {notes.data?.map((note) => (
          // The button sits in the row's layout rather than MUI's secondaryAction, which
          // overlays it and only reserves room for an icon, so long notes ran under it.
          <ListItem key={note.id} divider sx={{ alignItems: 'flex-start', gap: 2, px: 0 }}>
            <ListItemText
              primary={note.content}
              secondary={formatDateTime(note.timestamp)}
              sx={{ my: 0, minWidth: 0 }}
              slotProps={{ primary: { sx: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } } }}
            />
            <Button
              color="error"
              size="small"
              onClick={() => window.confirm('Delete this note?') && deleteNote.mutate(note.id)}
              disabled={deleteNote.isPending}
              sx={{ flexShrink: 0 }}
            >
              Delete note
            </Button>
          </ListItem>
        ))}
      </List>
    </Section>
  )
}
