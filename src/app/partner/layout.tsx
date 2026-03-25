import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner – OpenSportMap',
  description: 'Wer unterstützt OpenSportMap? Hier findest du alle Partner und Unterstützer des Projekts.',
  openGraph: {
    title: 'Partner – OpenSportMap',
    description: 'Wer unterstützt OpenSportMap? Hier findest du alle Partner und Unterstützer des Projekts.',
  },
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
