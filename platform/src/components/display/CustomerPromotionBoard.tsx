"use client";

import { useEffect, useMemo, useState } from "react";
import type { PromotionBoardPayload } from "@/lib/promotion-slide-image";

export function CustomerPromotionBoard({
  board,
  paused,
}: {
  board: PromotionBoardPayload;
  paused?: boolean;
}) {
  const slides = board.slides;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const activeIndex = slides.length ? index % slides.length : 0;
  const active = slides[activeIndex];

  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [slides.map((s) => s.id).join(",")]);

  useEffect(() => {
    if (!active || paused) return;
    const ms = active.durationSec * 1000;
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setVisible(true);
      }, 280);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [active, activeIndex, paused, slides.length]);

  if (!active) return null;

  return (
    <div
      className="customer-promo-board"
      data-testid="customer-promotion-board"
      aria-live="polite"
    >
      <div className="customer-promo-board__glow" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={active.id}
        src={active.imageUrl}
        alt={active.title || "Promotion"}
        className={`customer-promo-board__image${visible ? " is-visible" : ""}`}
      />
      {active.title ? (
        <p className={`customer-promo-board__title${visible ? " is-visible" : ""}`}>
          {active.title}
        </p>
      ) : null}
      {slides.length > 1 ? (
        <div className="customer-promo-board__dots" aria-hidden>
          {slides.map((slide, i) => (
            <span
              key={slide.id}
              className={`customer-promo-board__dot${i === activeIndex ? " is-on" : ""}`}
            />
          ))}
        </div>
      ) : null}
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
    return board.slides.reduce((sum, s) => sum + s.durationSec, 0) * 1000;
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
