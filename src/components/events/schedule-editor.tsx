'use client'

import { Plus, Trash2, Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { EventSchedule, ScheduleSlot, RecurringSlot } from '@/lib/supabase/types'

interface ScheduleEditorProps {
  value: EventSchedule
  onChange: (schedule: EventSchedule) => void
}

const WEEKDAYS: { key: RecurringSlot['day']; label: string }[] = [
  { key: 'monday',    label: 'Mo' },
  { key: 'tuesday',   label: 'Di' },
  { key: 'wednesday', label: 'Mi' },
  { key: 'thursday',  label: 'Do' },
  { key: 'friday',    label: 'Fr' },
  { key: 'saturday',  label: 'Sa' },
  { key: 'sunday',    label: 'So' },
]

type ScheduleMode = 'dates' | 'recurring'

const emptyDateSlot = (): ScheduleSlot => ({ date: '', start_time: '', end_time: null })

function emptySchedule(mode: ScheduleMode): EventSchedule {
  if (mode === 'recurring') return { type: 'recurring', slots: [] }
  return { type: 'dates', dates: [emptyDateSlot()] }
}

export default function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const mode: ScheduleMode = value.type === 'recurring' ? 'recurring' : 'dates'

  const setMode = (next: ScheduleMode) => {
    if (next === mode) return
    onChange(emptySchedule(next))
  }

  // --- dates helpers ---
  const dates = value.type !== 'recurring' ? value.dates : []

  const updateDate = (i: number, field: keyof ScheduleSlot, val: string | null) => {
    if (value.type === 'recurring') return
    const next = [...value.dates]
    next[i] = { ...next[i], [field]: val }
    onChange({ ...value, dates: next } as EventSchedule)
  }

  const addDate = () => {
    if (value.type === 'recurring') return
    onChange({ ...value, dates: [...value.dates, emptyDateSlot()] } as EventSchedule)
  }

  const removeDate = (i: number) => {
    if (value.type === 'recurring') return
    const next = value.dates.filter((_, idx) => idx !== i)
    onChange({ ...value, dates: next.length ? next : [emptyDateSlot()] } as EventSchedule)
  }

  // --- recurring helpers ---
  const slots = value.type === 'recurring' ? value.slots : []

  const isDayChecked = (day: RecurringSlot['day']) =>
    slots.some(s => s.day === day)

  const getDaySlot = (day: RecurringSlot['day']) =>
    slots.find(s => s.day === day)

  const toggleDay = (day: RecurringSlot['day'], checked: boolean) => {
    if (value.type !== 'recurring') return
    if (checked) {
      onChange({ ...value, slots: [...value.slots, { day, start_time: '18:00', end_time: null }] })
    } else {
      onChange({ ...value, slots: value.slots.filter(s => s.day !== day) })
    }
  }

  const updateDayTime = (day: RecurringSlot['day'], field: 'start_time' | 'end_time', val: string | null) => {
    if (value.type !== 'recurring') return
    onChange({
      ...value,
      slots: value.slots.map(s => s.day === day ? { ...s, [field]: val } : s),
    })
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex rounded-lg border overflow-hidden">
        {(['dates', 'recurring'] as ScheduleMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {m === 'dates' ? 'Einzeln' : 'Regelmäßig'}
          </button>
        ))}
      </div>

      {/* Single / multiple dates — two-row layout per slot */}
      {mode === 'dates' && (
        <div className="space-y-4">
          {dates.map((slot, i) => (
            <div key={i} className="space-y-2">
              {/* Row 1: date field + trash */}
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  {i === 0 && <Label className="text-xs mb-1 block">Datum</Label>}
                  <div className="relative w-full">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={slot.date}
                      onChange={e => updateDate(i, 'date', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                {dates.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => removeDate(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Row 2: start + end time */}
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  {i === 0 && <Label className="text-xs mb-1 block">Startzeit</Label>}
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={e => updateDate(i, 'start_time', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {i === 0 && (
                    <Label className="text-xs mb-1 block">
                      Endzeit <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                  )}
                  <div className="flex items-center gap-1">
                    <Input
                      type="time"
                      value={slot.end_time ?? ''}
                      onChange={e => updateDate(i, 'end_time', e.target.value || null)}
                      className="flex-1"
                    />
                    {slot.end_time && (
                      <button type="button" onClick={() => updateDate(i, 'end_time', null)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDate} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Termin hinzufügen
          </Button>
        </div>
      )}

      {/* Recurring */}
      {mode === 'recurring' && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {WEEKDAYS.map(({ key, label }) => {
              const active = isDayChecked(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key, !active)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {slots.length === 0 && (
            <p className="text-xs text-muted-foreground">Wähle mindestens einen Wochentag aus.</p>
          )}
          {slots.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="w-7 flex-shrink-0" />
              <Label className="text-xs flex-1 block">Startzeit</Label>
              <Label className="text-xs flex-1 block">
                Endzeit <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
            </div>
          )}
          {WEEKDAYS.filter(({ key }) => isDayChecked(key)).map(({ key, label }) => {
            const slot = getDaySlot(key)!
            return (
              <div key={key} className="flex gap-2 items-center">
                <span className="w-7 text-sm font-medium flex-shrink-0">{label}</span>
                <Input
                  type="time"
                  value={slot.start_time}
                  onChange={e => updateDayTime(key, 'start_time', e.target.value)}
                  className="flex-1"
                />
                <div className="flex flex-1 items-center gap-1">
                  <Input
                    type="time"
                    value={slot.end_time ?? ''}
                    onChange={e => updateDayTime(key, 'end_time', e.target.value || null)}
                    className="flex-1"
                  />
                  {slot.end_time && (
                    <button type="button" onClick={() => updateDayTime(key, 'end_time', null)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
