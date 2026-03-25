'use client'

import { useState } from 'react'
import { OpeningHours } from '@/lib/supabase/types'
import { DAY_ORDER, DAY_SHORT_DE, DayKey } from '@/lib/utils/opening-hours'
import { cn } from '@/lib/utils'

type DayStatus = 'unknown' | 'open' | 'closed'

interface DayState {
  status: DayStatus
  open: string
  close: string
}

type WeekState = Record<DayKey, DayState>

function initWeekState(hours: OpeningHours | null): WeekState {
  return Object.fromEntries(
    DAY_ORDER.map(key => {
      const day = hours?.[key]
      if (day === undefined) return [key, { status: 'unknown', open: '09:00', close: '18:00' }]
      if (day.closed) return [key, { status: 'closed', open: '09:00', close: '18:00' }]
      return [key, { status: 'open', open: day.open ?? '09:00', close: day.close ?? '18:00' }]
    })
  ) as WeekState
}

function weekStateToOpeningHours(state: WeekState): OpeningHours | null {
  const result: OpeningHours = {}
  for (const key of DAY_ORDER) {
    const day = state[key]
    if (day.status === 'open') result[key] = { closed: false, open: day.open, close: day.close }
    if (day.status === 'closed') result[key] = { closed: true }
    // unknown days are omitted
  }
  const hasAnySet = DAY_ORDER.some(k => state[k].status !== 'unknown')
  return hasAnySet ? result : null
}

interface OpeningHoursEditorProps {
  value: OpeningHours | null
  onChange: (hours: OpeningHours | null) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':')
  const hour = HOURS.includes(h) ? h : '09'
  const minute = MINUTES.includes(m) ? m : '00'
  return (
    <div className="flex items-center gap-0.5">
      <select
        value={hour}
        onChange={e => onChange(`${e.target.value}:${minute}`)}
        className="text-sm border border-input rounded-md px-1.5 py-1 bg-background focus:outline-none"
      >
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-sm text-muted-foreground">:</span>
      <select
        value={minute}
        onChange={e => onChange(`${hour}:${e.target.value}`)}
        className="text-sm border border-input rounded-md px-1.5 py-1 bg-background focus:outline-none"
      >
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

const SEGMENTS: { value: DayStatus; label: string }[] = [
  { value: 'open', label: 'Geöffnet' },
  { value: 'closed', label: 'Geschlossen' },
  { value: 'unknown', label: 'Unbekannt' },
]


export default function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const [week, setWeek] = useState<WeekState>(() => initWeekState(value))

  const updateDay = (key: DayKey, update: Partial<DayState>) => {
    const next = { ...week, [key]: { ...week[key], ...update } }
    setWeek(next)
    onChange(weekStateToOpeningHours(next))
  }

  return (
    <div className="space-y-3">
      {DAY_ORDER.map(key => {
        const day = week[key]
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-6 text-sm text-muted-foreground shrink-0 select-none">
                {DAY_SHORT_DE[key]}
              </span>
              <div className="flex flex-1 rounded-md border border-input overflow-hidden">
                {SEGMENTS.map((seg, i) => (
                  <button
                    key={seg.value}
                    type="button"
                    onClick={() => updateDay(key, { status: seg.value })}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-xs transition-colors',
                      i > 0 && 'border-l border-input',
                      day.status === seg.value
                        ? seg.value === 'unknown'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
            {day.status === 'open' && (
              <div className="flex items-center gap-2 pl-9">
                <TimePicker value={day.open} onChange={v => updateDay(key, { open: v })} />
                <span className="text-sm text-muted-foreground">–</span>
                <TimePicker value={day.close} onChange={v => updateDay(key, { close: v })} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
