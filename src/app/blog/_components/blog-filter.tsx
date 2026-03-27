'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BlogPost } from '../posts'

interface Props {
  posts: BlogPost[]
  activeCity: string
  activeSport: string
}

export default function BlogFilter({ posts, activeCity, activeSport }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const update = (key: 'city' | 'sport', value: string) => {
    const params = new URLSearchParams()
    const newCity = key === 'city' ? value : activeCity
    const newSport = key === 'sport' ? value : activeSport
    if (newCity) params.set('city', newCity)
    if (newSport) params.set('sport', newSport)
    router.push(params.toString() ? `${pathname}?${params}` : pathname)
  }

  const clearAll = () => router.push(pathname)

  const cities = [...new Set(posts.filter(p => p.category === 'city').map(p => p.tag))]
  const sports = [...new Set(posts.map(p => p.sportType))]
  const isAll = !activeCity && !activeSport

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={clearAll}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap ${
          isAll
            ? 'bg-foreground text-background border-foreground'
            : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
        }`}
      >
        Alle
      </button>

      <Select
        key={activeCity || 'city-default'}
        value={activeCity || undefined}
        onValueChange={v => update('city', v)}
        disabled={cities.length === 0}
      >
        <SelectTrigger className="h-8 text-xs rounded-full px-3 w-auto min-w-24 max-w-40">
          <SelectValue placeholder="Stadt" />
        </SelectTrigger>
        <SelectContent>
          {cities.map(tag => (
            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={activeSport || 'sport-default'}
        value={activeSport || undefined}
        onValueChange={v => update('sport', v)}
        disabled={sports.length === 0}
      >
        <SelectTrigger className="h-8 text-xs rounded-full px-3 w-auto min-w-24 max-w-40">
          <SelectValue placeholder="Sportart" />
        </SelectTrigger>
        <SelectContent>
          {sports.map(tag => (
            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
