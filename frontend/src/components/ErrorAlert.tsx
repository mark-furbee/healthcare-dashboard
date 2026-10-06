import { Alert, Button } from '@mui/material'

export function ErrorAlert({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const action = onRetry && (
    <Button color="inherit" size="small" onClick={onRetry}>
      Retry
    </Button>
  )
  return (
    <Alert severity="error" action={action}>
      {error.message}
    </Alert>
  )
}
