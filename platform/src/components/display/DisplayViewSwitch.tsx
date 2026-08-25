"use client";

export function DisplayViewSwitch({
  slug,
  variant,
}: {
  slug: string;
  variant: "customer" | "reception";
}) {
  const base = `/display/${slug}`;
  const customer = variant === "customer";
  const item = (href: string, label: string, active: boolean) => (
    <a
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase ${
        active
          ? customer
            ? "bg-[var(--cd-accent)] text-[color:var(--cd-on-accent)]"
            : "bg-[#c9a87c] text-[#1c1714]"
          : "text-current/70 hover:text-current"
      }`}
    >
      {label}
    </a>
  );
  return (
    <nav
      className={`flex rounded-full p-0.5 ${
        customer ? "border border-[color:var(--cd-line)]" : "border border-current/20"
      }`}
      aria-label="Display mode"
    >
      {item(base, "Customer", variant === "customer")}
      {item(`${base}/reception`, "Reception", variant === "reception")}
    </nav>
  );
}
