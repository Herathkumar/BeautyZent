/** Lightweight route loading — avoid full-screen branded splash (felt like a hang). */
export default function ManagerLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-4 px-4 py-8" aria-busy="true">
      <div className="h-3 w-24 rounded bg-[color:var(--line)]" />
      <div className="h-10 w-64 max-w-full rounded bg-[color:var(--line)]" />
      <div className="h-4 w-40 rounded bg-[color:var(--line)]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-stat-card h-28 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
