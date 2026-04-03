export const metadata = {
  title: 'Widget Demo',
}

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Sportplätze in Köln</h1>
          <p className="text-gray-500 text-base">
            Entdecke kostenlose Sportplätze in deiner Nähe. Klicke auf einen Pin für mehr Infos.
          </p>
        </div>

        <iframe
          src="/widget/koeln"
          width="100%"
          height="480"
          style={{ border: 'none', borderRadius: '12px', display: 'block' }}
          loading="lazy"
        />
      </main>
    </div>
  )
}
