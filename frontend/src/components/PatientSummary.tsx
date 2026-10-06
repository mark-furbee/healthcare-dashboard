import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { summaryQuery } from '../queries'
import { Detail, DetailList } from './DetailList'
import { ErrorAlert } from './ErrorAlert'
import { Section } from './Section'

function Chips({ names, color }: { names: string[]; color?: 'warning' }) {
  if (names.length === 0) return <Typography color="text.secondary">None recorded</Typography>
  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
      {names.map((name) => (
        <Chip key={name} label={name} color={color} />
      ))}
    </Stack>
  )
}

export function PatientSummary({ patientId }: { patientId: number }) {
  const summary = useQuery(summaryQuery(patientId))
  return (
    <Section title="Summary">
      {summary.isPending && <CircularProgress size={24} />}
      {summary.isError && <ErrorAlert error={summary.error} onRetry={() => summary.refetch()} />}
      {summary.isSuccess && (
        <Stack spacing={2}>
          <Typography>{summary.data.overview}</Typography>
          <DetailList
            sx={{
              gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
              columnGap: 3,
              rowGap: 1.5,
            }}
          >
            <Detail inline label="Conditions">
              <Chips names={summary.data.conditions} />
            </Detail>
            {/* Allergies stand out: they matter for every treatment decision. */}
            <Detail inline label="Allergies">
              <Chips names={summary.data.allergies} color="warning" />
            </Detail>
            <Detail inline label="History">
              {summary.data.history.length === 0 ? (
                <Typography color="text.secondary">
                  No clinical notes have been recorded.
                </Typography>
              ) : (
                <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                  {summary.data.history.map((entry, index) => (
                    <Box
                      component="li"
                      key={index}
                      sx={{ display: 'grid', gridTemplateColumns: '6.5em 1fr', columnGap: 1 }}
                    >
                      <Typography color="text.secondary">{entry.date}</Typography>
                      <Typography sx={{ overflowWrap: 'anywhere' }}>{entry.excerpt}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Detail>
          </DetailList>
        </Stack>
      )}
    </Section>
  )
}
