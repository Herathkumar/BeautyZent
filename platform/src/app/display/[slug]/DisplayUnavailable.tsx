export function DisplayUnavailable({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1714] px-6 text-center text-[#f5ebe0]">
      <div className="max-w-md space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">{title}</h1>
        <p className="text-sm text-[#c4b0a2]">{detail}</p>
      </div>
    </main>
  );
}
