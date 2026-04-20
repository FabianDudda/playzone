'use client'

import { Calendar, RefreshCw } from 'lucide-react'
import { EventSchedule, RecurringSlot } from '@/lib/supabase/types'

interface ScheduleDisplayProps {
  schedule: EventSchedule
  className?: string
}

const DAY_LABELS: Record<RecurringSlot['day'], string> = {
  monday:    'Montag',
  tuesday:   'Dienstag',
  wednesday: 'Mittwoch',
  thursday:  'Donnerstag',
  friday:    'Freitag',
  saturday:  'Samstag',
  sunday:    'Sonntag',
}


const DAY_ORDER: RecurringSlot['day'][] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end} Uhr`
}

function formatDate(dateStr: string, startTime: string, endTime: string): string {
  try {
    const d = new Date(`${dateStr}T${startTime || '00:00'}`)
    const formatted = d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return startTime ? `${formatted} · ${formatTimeRange(startTime, endTime)}` : formatted
  } catch {
    return dateStr
  }
}


export default function ScheduleDisplay({
  schedule,
  className = '',
}: ScheduleDisplayProps) {
  if (schedule.type === 'recurring') {
    const sorted = [...schedule.slots].sort(
      (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
    )
    return (
      <div className={`space-y-2 ${className}`}>
        {sorted.map(s => (
          <div key={s.day} className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{DAY_LABELS[s.day]} · {formatTimeRange(s.start_time, s.end_time)}</span>
          </div>
        ))}
      </div>
    )
  }

  const dates = schedule.dates || []

  if (dates.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <span>Kein Termin angegeben</span>
      </div>
    )
  }

  if (dates.length === 1) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>{formatDate(dates[0].date, dates[0].start_time, dates[0].end_time)}</span>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {dates.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>{formatDate(d.date, d.start_time, d.end_time)}</span>
        </div>
      ))}
    </div>
  )
}
