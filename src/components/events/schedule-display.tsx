'use client'

import { Calendar, RefreshCw } from 'lucide-react'
import { EventSchedule, RecurringSlot } from '@/lib/supabase/types'

interface ScheduleDisplayProps {
  schedule: EventSchedule
  showNextOccurrence?: boolean
  className?: string
}

const DAY_LABELS: Record<RecurringSlot['day'], string> = {
  monday:    'Mo',
  tuesday:   'Di',
  wednesday: 'Mi',
  thursday:  'Do',
  friday:    'Fr',
  saturday:  'Sa',
  sunday:    'So',
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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return startTime ? `${formatted} · ${formatTimeRange(startTime, endTime)}` : formatted
  } catch {
    return dateStr
  }
}

function getNextRecurring(slots: RecurringSlot[]): string | null {
  if (slots.length === 0) return null

  const now = new Date()
  const todayIndex = (now.getDay() + 6) % 7 // Mon=0, Sun=6

  const slotsByDay = Object.fromEntries(
    slots.map(s => [s.day, s])
  )

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7
    const dayKey = DAY_ORDER[dayIndex]
    const slot = slotsByDay[dayKey]
    if (!slot) continue

    if (offset === 0) {
      const [h, m] = slot.start_time.split(':').map(Number)
      const slotTime = new Date()
      slotTime.setHours(h, m, 0, 0)
      if (slotTime <= now) continue
    }

    const label = offset === 0 ? 'heute' : offset === 1 ? 'morgen' : `in ${offset} Tagen`
    return `Nächster Termin: ${DAY_LABELS[dayKey]}, ${formatTimeRange(slot.start_time, slot.end_time)} (${label})`
  }

  return null
}

export default function ScheduleDisplay({
  schedule,
  showNextOccurrence = true,
  className = '',
}: ScheduleDisplayProps) {
  if (schedule.type === 'recurring') {
    const sorted = [...schedule.slots].sort(
      (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
    )
    const summary = sorted
      .map(s => `${DAY_LABELS[s.day]} ${formatTimeRange(s.start_time, s.end_time)}`)
      .join(' · ')
    const next = showNextOccurrence ? getNextRecurring(sorted) : null

    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>{summary} (wöchentlich)</span>
        </div>
        {next && (
          <p className="text-xs text-muted-foreground pl-6">{next}</p>
        )}
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
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>{dates.length} Termine</span>
      </div>
      <ul className="pl-6 space-y-0.5">
        {dates.map((d, i) => (
          <li key={i} className="text-xs text-muted-foreground">
            {formatDate(d.date, d.start_time, d.end_time)}
          </li>
        ))}
      </ul>
    </div>
  )
}
