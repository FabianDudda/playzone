import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface Props {
  name: string
  location: string
  emoji: string
  gradient: string
  badge?: string
  image?: string
  mapUrl?: string

}

export default function SportPlaceImage({ name, location, emoji, gradient, image, mapUrl = '/map' }: Props) {
  return (
    <div>
      <div className="rounded-xl overflow-hidden">
        {image ? (
          <div className="relative h-44">
            <Image
              src={image}
              alt={`${name} – ${location}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 576px"
            />
          </div>
        ) : (
          <div className={`bg-gradient-to-br ${gradient} h-36 flex items-center justify-center relative`}>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <span className="text-6xl relative z-10">{emoji}</span>
          </div>
        )}
      </div>
      <Link href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${buttonVariants({ variant: 'outline' })} mt-2 w-full gap-2 text-foreground`}>
        <MapPin className="h-4 w-4" />
        Auf Karte ansehen
      </Link>
    </div>
  )
}
