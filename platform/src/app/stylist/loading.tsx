/** Lightweight route loading — avoid a branded splash that disagrees with SSR. */
export default function StylistLoading() {
  return (
    <div className="mx-auto w-full max-w-lg animate-pulse space-y-4 px-4 py-8" aria-busy="true">
      <div className="h-3 w-20 rounded bg-[color:var(--line)]" />
      <div className="h-10 w-52 max-w-full rounded bg-[color:var(--line)]" />
      <div className="h-24 rounded-2xl bg-[color:var(--line)]" />
      <div className="h-24 rounded-2xl bg-[color:var(--line)]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
