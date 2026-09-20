"use client";

import { useState } from "react";

export type ExploreGalleryPhoto = {
  id: string;
  url: string;
};

export function ExploreHeroGallery({ photos }: { photos: ExploreGalleryPhoto[] }) {
  const [selected, setSelected] = useState(0);
  const active = photos[selected] ?? photos[0];
  const showThumbs = photos.length > 1;

  if (!active) return null;

  return (
    <div className="explore-menu__gallery">
      <div className="explore-menu__cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.url} alt="" />
      </div>

      {showThumbs ? (
        <div className="explore-menu__thumbs" role="listbox" aria-label="Photos">
          {photos.map((photo, index) => {
            const isSelected = index === selected;
            return (
              <button
                key={photo.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`explore-menu__thumb${isSelected ? " is-selected" : ""}`}
                onClick={() => setSelected(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
