import { Chip } from '@mui/material'
import { capitalize } from '../format'
import type { Status } from '../types'

const COLORS = { active: 'success', inactive: 'default', discharged: 'warning' } as const

export function StatusChip({ status }: { status: Status }) {
  return <Chip label={capitalize(status)} color={COLORS[status]} />
}
