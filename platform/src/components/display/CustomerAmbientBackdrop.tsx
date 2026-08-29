/** Soft gold rays + floating particles behind the customer lounge (CSS-only). */
export function CustomerAmbientBackdrop() {
  return (
    <div className="customer-ambient" aria-hidden>
      <div className="customer-ambient__rays" />
      <div className="customer-ambient__particles">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="customer-ambient__dot" />
        ))}
      </div>
    </div>
  );
}
