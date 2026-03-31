import type { Metadata } from "next"
import { Suspense } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import QueryProvider from "@/components/providers/query-provider"
import AuthProvider from "@/components/providers/auth-provider"
import BottomNav from "@/components/layout/bottom-nav"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'OpenSportMap',
  url: 'https://opensportmap.de',
  description: 'Kostenlose Sportplätze in deiner Nähe finden – über 13.000 Plätze in Deutschland.',
  inLanguage: 'de',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://opensportmap.de/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

export const metadata: Metadata = {
  title: "Kostenlose Sportplätze finden | OpenSportMap",
  description: "Über 13.000 kostenlose Sportplätze in Deutschland auf einer interaktiven Karte. Basketball, Fußball, Tennis, Skateparks & mehr – jetzt entdecken.",
  metadataBase: new URL("https://opensportmap.de"),
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://opensportmap.de",
    siteName: "OpenSportMap",
    title: "Kostenlose Sportplätze finden | OpenSportMap",
    description: "Über 13.000 kostenlose Sportplätze in Deutschland auf einer interaktiven Karte. Basketball, Fußball, Tennis, Skateparks & mehr.",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon_192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/favicon_192x192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://abminvrgugkbzgxvqxap.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://abminvrgugkbzgxvqxap.supabase.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="install-prompt"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});`,
          }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1 pb-16">{children}</main>
<Suspense><BottomNav /></Suspense>
            </div>
            <Toaster />
            <Analytics />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
