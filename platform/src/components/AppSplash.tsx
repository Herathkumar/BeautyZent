const VARIANTS = {
  manager: {
    label: "Manager",
    className: "app-splash--manager",
  },
  stylist: {
    label: "Stylist App",
    className: "app-splash--stylist",
  },
  display: {
    label: "Salon Display",
    className: "app-splash--display",
  },
  book: {
    label: "Online Booking",
    className: "app-splash--book",
  },
} as const;

export function AppSplash({ variant }: { variant: keyof typeof VARIANTS }) {
  const v = VARIANTS[variant];
  return (
    <div className={`app-splash ${v.className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="app-splash-inner">
        <p className="app-splash-brand">FHSalon</p>
        <p className="app-splash-label">{v.label}</p>
        <div className="app-splash-spinner" aria-hidden />
      </div>
    </div>
  );
}
