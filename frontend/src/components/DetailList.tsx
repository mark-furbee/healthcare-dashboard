import { Box, Typography, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'

/** A description list (dl); `sx` sets its grid layout. */
export function DetailList({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box component="dl" sx={[{ display: 'grid', m: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  )
}

/**
 * A labelled value in a DetailList: the label above the value, or, when `inline`, the label and
 * value as separate grid cells, for a list laid out in a label column and a value column.
 */
export function Detail({
  label,
  inline,
  children,
}: {
  label: string
  inline?: boolean
  children: ReactNode
}) {
  const content = (
    <>
      <Typography component="dt" variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Box>
    </>
  )
  return inline ? content : <div>{content}</div>
}
