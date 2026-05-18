import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unterstützen – OpenSportMap',
  description: 'Unterstütze OpenSportMap und hilf dabei, kostenlose Sportplätze für alle sichtbar zu machen.',
  openGraph: {
    title: 'Unterstützen – OpenSportMap',
    description: 'Unterstütze OpenSportMap und hilf dabei, kostenlose Sportplätze für alle sichtbar zu machen.',
  },
}

export default function UnterstuetzenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
