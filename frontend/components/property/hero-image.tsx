import Image from "next/image";

interface HeroImageProps {
  src: string;
  alt: string;
}

export function HeroImage({ src, alt }: HeroImageProps) {
  return (
    <div className="relative w-full aspect-[16/10] max-h-[60vh] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}
