"use client";

interface HeroImageProps {
  src: string;
  alt: string;
}

export function HeroImage({ src, alt }: HeroImageProps) {
  return (
    <div className="relative w-full" style={{ maxHeight: "60vh" }}>
      <img
        src={src}
        alt={alt}
        className="w-full object-cover"
        style={{ maxHeight: "60vh" }}
        fetchPriority="high"
      />
    </div>
  );
}
