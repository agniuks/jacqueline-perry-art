import { Artwork } from "@/lib/types";
import ArtworkCard from "./ArtworkCard";

export default function ArtworkGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork) => (
        <ArtworkCard key={artwork.slug} artwork={artwork} />
      ))}
    </div>
  );
}
