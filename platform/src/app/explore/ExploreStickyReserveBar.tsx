"use client";

import { useEffect, useState } from "react";

/**
 * Desktop sticky reserve bar. Appears after the header Reserve leaves the
 * viewport. Hidden on mobile where the native bottom CTA already exists.
 */
export function ExploreStickyReserveBar({
  anchorId,
  businessName,
  startingPriceLabel,
  bookHref,
}: {
  anchorId: string;
  businessName: string;
  startingPriceLabel: string | null;
  bookHref: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const mq = window.matchMedia("(min-width: 768px)");
    const sync = (outOfView: boolean) => {
      const show = mq.matches && outOfView;
      setVisible(show);
      document.documentElement.classList.toggle("explore-menu-sticky-active", show);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        sync(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );
    observer.observe(anchor);

    const onMq = () => {
      const rect = anchor.getBoundingClientRect();
      const out =
        rect.bottom < 0 || rect.top > (window.innerHeight || 0);
      sync(out);
    };
    mq.addEventListener("change", onMq);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMq);
      document.documentElement.classList.remove("explore-menu-sticky-active");
    };
  }, [anchorId]);

  if (!visible) return null;

  return (
    <div className="explore-menu__sticky-bar" role="region" aria-label="Reserve">
      <div className="explore-menu__sticky-bar-inner">
        <div className="explore-menu__sticky-copy">
          <p className="explore-menu__sticky-name">{businessName}</p>
          {startingPriceLabel ? (
            <p className="explore-menu__sticky-price">From {startingPriceLabel}</p>
          ) : null}
        </div>
        <a href={bookHref} className="explore-luxe__btn-book explore-menu__sticky-reserve">
          Reserve
        </a>
      </div>
    </div>
  );
}
