import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE } from '@/lib/supabase/seo-queries'

interface PaginationProps {
  total: number
  currentPage: number
  basePath: string  // e.g. "/orte/basketball/deutschland/berlin"
}

export default function Pagination({ total, currentPage, basePath }: PaginationProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  const pageUrl = (page: number) =>
    page === 1 ? basePath : `${basePath}?seite=${page}`

  // Show at most 5 page numbers around current
  const delta = 2
  const range: number[] = []
  for (
    let i = Math.max(1, currentPage - delta);
    i <= Math.min(totalPages, currentPage + delta);
    i++
  ) {
    range.push(i)
  }

  return (
    <nav aria-label="Seiten" className="flex items-center justify-center gap-1 pt-4">
      {currentPage > 1 && (
        <Link
          href={pageUrl(currentPage - 1)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-accent/50 transition-colors"
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {range[0] > 1 && (
        <>
          <Link
            href={pageUrl(1)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-accent/50 transition-colors text-sm"
          >
            1
          </Link>
          {range[0] > 2 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
        </>
      )}

      {range.map(page => (
        <Link
          key={page}
          href={pageUrl(page)}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border text-sm transition-colors ${
            page === currentPage
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent/50'
          }`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {range[range.length - 1] < totalPages && (
        <>
          {range[range.length - 1] < totalPages - 1 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
          <Link
            href={pageUrl(totalPages)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-accent/50 transition-colors text-sm"
          >
            {totalPages}
          </Link>
        </>
      )}

      {currentPage < totalPages && (
        <Link
          href={pageUrl(currentPage + 1)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-accent/50 transition-colors"
          aria-label="Nächste Seite"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
