import Image from "next/image";
import Link from "next/link";
import { Artwork } from "@/lib/types";

export default function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const mainImage = artwork.images[0];

  return (
    <Link href={`/artwork/${artwork.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Image
          src={`/images/artworks/${artwork.slug}/${mainImage}`}
          alt={artwork.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
      </div>
      <div className="mt-3">
        <h2 className="text-sm font-normal text-neutral-900">
          {artwork.title}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{artwork.price}</p>
      </div>
    </Link>
  );
}
