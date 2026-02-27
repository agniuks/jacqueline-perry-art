"use client";

import Image from "next/image";
import { useState } from "react";

interface ImageGalleryProps {
  slug: string;
  images: string[];
  title: string;
}

export default function ImageGallery({
  slug,
  images,
  title,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div>
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <Image
          src={`/images/artworks/${slug}/${images[selectedIndex]}`}
          alt={`${title} - Image ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image}
              onClick={() => setSelectedIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 transition-colors ${
                index === selectedIndex
                  ? "border-neutral-900"
                  : "border-transparent hover:border-neutral-300"
              }`}
            >
              <Image
                src={`/images/artworks/${slug}/${image}`}
                alt={`${title} thumbnail ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
