import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateWebsite(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const normalized = /^https?:\/\//i.test(value) ? value : 'https://' + value
  try {
    const parsed = new URL(normalized)
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'Ungültige Website-Adresse'
    if (!parsed.hostname.includes('.')) return 'Ungültige Website-Adresse'
    return null
  } catch {
    return 'Ungültige Website-Adresse'
  }
}