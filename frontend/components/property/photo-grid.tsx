"use client";

import { useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  position: number;
}

interface PhotoGridProps {
  photos: Photo[];
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-gray-100"
            >
              <img
                src={photo.thumbnail_url}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
