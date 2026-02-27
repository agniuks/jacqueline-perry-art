import ArtworkGrid from "@/components/ArtworkGrid";
import { getAllArtworks } from "@/lib/artworks";

export default function GalleryPage() {
  const artworks = getAllArtworks();

  return (
    <section>
      <ArtworkGrid artworks={artworks} />
    </section>
  );
}
