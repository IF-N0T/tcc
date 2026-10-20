export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Carregando conteúdo...</span>
      <div className="h-8 w-56 animate-pulse rounded bg-gray-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="card h-24 animate-pulse bg-gray-50" />)}
      </div>
      <div className="card h-72 animate-pulse bg-gray-50" />
    </div>
  );
}
