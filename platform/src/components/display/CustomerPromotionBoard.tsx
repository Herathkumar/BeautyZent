"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PromoBoardIcon,
  PromotionBoardPayload,
  PromotionBoardSlide,
} from "@/lib/promotion-board";

function PromoIcon({ icon }: { icon: PromoBoardIcon }) {
  if (icon === "gift" || icon === "crown") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <rect x="14" y="28" width="36" height="24" rx="3" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 34h36" stroke="currentColor" strokeWidth="2.2" />
        <path d="M32 28v24" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M32 28c-6-8-14-8-14-2 0 4 6 6 14 8 8-2 14-4 14-8 0-6-8-6-14 2Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "handshake") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <path
          d="M12 30c5-7 12-9 20-4l4 3c4-5 11-7 16-2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M18 36c4 5 11 9 18 7 5-1 9-4 12-8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d="M28 34c2 2.5 5.5 3.5 9 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "milestone") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <circle cx="32" cy="34" r="14" stroke="currentColor" strokeWidth="2.2" />
        <path d="M32 34V24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 34l8 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 12v4M32 52v4M12 34h4M48 34h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M20 18l2.5 2.5M44 18l-2.5 2.5M20 50l2.5-2.5M44 50l-2.5-2.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M20 24h24l3 28H17l3-28Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M24 24c0-6 3.5-10 8-10s8 4 8 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M29 36h6M32 33v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoldRule({ variant = "diamond" }: { variant?: "diamond" | "dot" | "spark" }) {
  return (
    <div className={`customer-promo-card__rule customer-promo-card__rule--${variant}`} aria-hidden>
      <span />
      <i />
      <span />
    </div>
  );
}

function splitSalonName(name: string) {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return { primary: trimmed, secondary: "" };
  if (/beauty|parlor|salon|studio|spa/i.test(parts[parts.length - 1])) {
    return {
      primary: parts.slice(0, -1).join(" "),
      secondary: parts.slice(-1).join(" "),
    };
  }
  if (parts.length >= 3) {
    return {
      primary: parts.slice(0, -2).join(" "),
      secondary: parts.slice(-2).join(" "),
    };
  }
  return { primary: parts[0], secondary: parts.slice(1).join(" ") };
}

function PromoCard({
  slide,
  salonName,
  size = "hero",
}: {
  slide: PromotionBoardSlide;
  salonName: string;
  size?: "hero" | "side" | "thumb";
}) {
  const t = slide.template;
  const brand = splitSalonName(salonName);

  return (
    <article
      className={`customer-promo-card customer-promo-card--${size}`}
      data-promo-type={slide.type}
    >
      <div className="customer-promo-card__frame">
        <div className="customer-promo-card__icon">
          <PromoIcon icon={t.icon} />
        </div>

        <p className="customer-promo-card__eyebrow">
          <span>{t.eyebrow}</span>
        </p>
        <GoldRule variant="diamond" />

        <h3 className="customer-promo-card__headline">
          <span className="customer-promo-card__headline-main">{t.headline}</span>
          {t.headlineAccent ? (
            <span className="customer-promo-card__headline-accent">{t.headlineAccent}</span>
          ) : null}
        </h3>

        <p className="customer-promo-card__offer">{t.offer}</p>

        {size === "hero" && t.description ? (
          <p className="customer-promo-card__desc">{t.description}</p>
        ) : null}

        <GoldRule variant="spark" />

        <div className="customer-promo-card__brand">
          <p className="customer-promo-card__brand-primary">{brand.primary}</p>
          {brand.secondary ? (
            <p className="customer-promo-card__brand-secondary">{brand.secondary}</p>
          ) : null}
        </div>

        <span className="customer-promo-card__flourish" aria-hidden />
      </div>
    </article>
  );
}

function PromoGoldParticles() {
  return (
    <div className="customer-promo-board__particles" aria-hidden>
      <div className="customer-promo-board__particle-layer is-far">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={`far-${i}`} className="customer-promo-board__spark" />
        ))}
      </div>
      <div className="customer-promo-board__particle-layer is-mid">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={`mid-${i}`} className="customer-promo-board__spark" />
        ))}
      </div>
      <div className="customer-promo-board__particle-layer is-near">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={`near-${i}`} className="customer-promo-board__spark" />
        ))}
      </div>
    </div>
  );
}

export function CustomerPromotionBoard({
  board,
  paused,
}: {
  board: PromotionBoardPayload;
  paused?: boolean;
}) {
  const slides = board.slides;
  const [index, setIndex] = useState(0);

  const activeIndex = slides.length ? ((index % slides.length) + slides.length) % slides.length : 0;
  const active = slides[activeIndex];
  const prev = slides.length > 1 ? slides[(activeIndex - 1 + slides.length) % slides.length] : null;
  const next = slides.length > 1 ? slides[(activeIndex + 1) % slides.length] : null;

  useEffect(() => {
    setIndex(0);
  }, [slides.map((s) => s.id).join(",")]);

  useEffect(() => {
    if (!active || paused || slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => i + 1);
    }, active.durationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [active, activeIndex, paused, slides.length]);

  if (!active) return null;

  return (
    <div className="customer-promo-board" data-testid="customer-promotion-board" aria-live="polite">
      <PromoGoldParticles />
      <div className="customer-promo-board__stage">
        <p className="customer-promo-board__kicker">{active.thumbLabel}</p>

        <div className="customer-promo-board__carousel">
          {prev ? (
            <button
              type="button"
              className="customer-promo-board__side is-prev"
              onClick={() => setIndex((i) => i - 1)}
              aria-label="Previous promotion"
            >
              <PromoCard slide={prev} salonName={board.salonName} size="side" />
            </button>
          ) : (
            <span className="customer-promo-board__side is-spacer" aria-hidden />
          )}

          <div className="customer-promo-board__hero" key={active.id}>
            <PromoCard slide={active} salonName={board.salonName} size="hero" />
          </div>

          {next ? (
            <button
              type="button"
              className="customer-promo-board__side is-next"
              onClick={() => setIndex((i) => i + 1)}
              aria-label="Next promotion"
            >
              <PromoCard slide={next} salonName={board.salonName} size="side" />
            </button>
          ) : (
            <span className="customer-promo-board__side is-spacer" aria-hidden />
          )}
        </div>

        <div className="customer-promo-board__nav">
          <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={slides.length < 2}>
            ‹ Previous
          </button>
          <p>
            This month’s specials <span>·</span> Slide {activeIndex + 1} of {slides.length}
          </p>
          <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={slides.length < 2}>
            Next ›
          </button>
        </div>
      </div>

      <div className="customer-promo-board__thumbs" role="tablist" aria-label="Promotions">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            className={`customer-promo-board__thumb${i === activeIndex ? " is-on" : ""}`}
            onClick={() => setIndex(i)}
          >
            <span className="customer-promo-board__thumb-num">{i + 1}</span>
            <PromoCard slide={slide} salonName={board.salonName} size="thumb" />
            <span className="customer-promo-board__thumb-caption">{slide.thumbLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function usePromotionBoardCycle(
  board: PromotionBoardPayload | null,
  opts: { paused?: boolean }
) {
  const [showBoard, setShowBoard] = useState(false);

  const showDurationMs = useMemo(() => {
    if (!board?.enabled || !board.slides.length) return 0;
    return Math.max(5, board.showSec || 24) * 1000;
  }, [board]);

  useEffect(() => {
    if (!board?.enabled || !board.slides.length || opts.paused || showDurationMs <= 0) {
      setShowBoard(false);
      return;
    }

    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const startCycle = () => {
      showTimer = setTimeout(() => {
        setShowBoard(true);
        hideTimer = setTimeout(() => {
          setShowBoard(false);
          startCycle();
        }, showDurationMs);
      }, board.intervalSec * 1000);
    };

    startCycle();
    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [board, opts.paused, showDurationMs]);

  return showBoard;
}
