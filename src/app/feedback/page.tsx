'use client'

import { useState } from 'react'
import { Bug, Lightbulb, MessageSquare, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/layout/back-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase/client'

type FeedbackCategory = 'bug' | 'feature' | 'other'

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ElementType }[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Feature', icon: Lightbulb },
  { value: 'other', label: 'Feedback', icon: MessageSquare },
]

export default function FeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('feedback').insert({
      category: category ?? 'other',
      message: message.trim(),
      user_id: user?.id ?? null,
      email: user?.email ?? (email.trim() || null),
    })

    setSubmitting(false)

    if (insertError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="container px-4 py-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Give Feedback</h1>
        </div>

        {submitted ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Thanks for your feedback!</h2>
                <p className="text-sm text-muted-foreground">
                  Your message has been received and will help improve the app.
                </p>
              </div>
              <Button variant="outline" onClick={() => router.back()}>
                Zurück
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category selector */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Category <span className="italic">(optional)</span></p>
              <div className="flex gap-2">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(category === value ? null : value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      category === value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your feedback in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                {/* Email — only shown for guests */}
                {!user && (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="so we can follow up with you"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={submitting || !message.trim()}>
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  )
}
