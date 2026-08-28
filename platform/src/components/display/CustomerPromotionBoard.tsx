"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PromoBoardIcon,
  PromotionBoardPayload,
  PromotionBoardSlide,
} from "@/lib/promotion-board";

function PromoIcon({ icon }: { icon: PromoBoardIcon }) {
  if (icon === "crown") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <path
          d="M12 44h40l-4 10H16L12 44Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M12 44 20 22l12 12 12-16 8 26"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="3" fill="currentColor" />
        <circle cx="32" cy="14" r="3" fill="currentColor" />
        <circle cx="44" cy="18" r="3" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "handshake") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <path
          d="M10 30c6-8 14-10 22-4l4 4c4-6 12-8 18-2"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M18 36c4 6 12 10 20 8 4-1 8-4 10-8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M28 34c2 3 6 4 10 2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (icon === "milestone") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M32 18v14l9 5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "spend") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden>
        <rect x="14" y="18" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2.4" />
        <path d="M14 28h36" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="32" cy="38" r="4" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M20 26h24l-2 22H22L20 26Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 26c0-6 4-10 8-10s8 4 8 10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
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
  return (
    <article
      className={`customer-promo-card customer-promo-card--${size} customer-promo-card--${t.accent}`}
      data-promo-type={slide.type}
    >
      <div className="customer-promo-card__icon">
        <PromoIcon icon={t.icon} />
      </div>
      {size !== "thumb" ? <p className="customer-promo-card__eyebrow">{t.eyebrow}</p> : null}
      <h3 className="customer-promo-card__headline">{t.headline}</h3>
      <p className="customer-promo-card__offer">{t.offer}</p>
      {size === "hero" ? <p className="customer-promo-card__desc">{t.description}</p> : null}
      {size !== "thumb" ? (
        <p className="customer-promo-card__brand">{salonName}</p>
      ) : (
        <span className="customer-promo-card__thumb-label">{slide.thumbLabel}</span>
      )}
    </article>
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
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={slides.length < 2}
          >
            ‹ Previous
          </button>
          <p>
            This month’s specials <span>·</span> Slide {activeIndex + 1} of {slides.length}
          </p>
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            disabled={slides.length < 2}
          >
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
