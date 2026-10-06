import { CircularProgress, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { summaryQuery } from '../queries'
import { ErrorAlert } from './ErrorAlert'
import { Section } from './Section'

export function PatientSummary({ patientId }: { patientId: number }) {
  const summary = useQuery(summaryQuery(patientId))
  return (
    <Section title="Summary">
      {summary.isPending && <CircularProgress size={24} />}
      {summary.isError && <ErrorAlert error={summary.error} onRetry={() => summary.refetch()} />}
      {summary.isSuccess && <Typography>{summary.data.summary}</Typography>}
    </Section>
  )
}
