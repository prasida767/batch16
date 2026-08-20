export default function RivalriesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-muted" />
      <div className="h-4 w-72 max-w-full rounded bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
