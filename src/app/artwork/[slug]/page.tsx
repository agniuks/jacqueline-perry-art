import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getArtworkBySlug, getArtworkSlugs } from "@/lib/artworks";
import BackLink from "@/components/BackLink";
import ImageGallery from "@/components/ImageGallery";
import ArtworkDetails from "@/components/ArtworkDetails";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getArtworkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) return { title: "Not Found" };

  return {
    title: `${artwork.title} — Jacqueline Perry Art`,
    description: artwork.description || `${artwork.title} by Jacqueline Perry`,
    openGraph: {
      title: artwork.title,
      description:
        artwork.description || `${artwork.title} by Jacqueline Perry`,
      images: [`/images/artworks/${artwork.slug}/${artwork.images[0]}`],
    },
  };
}

export default async function ArtworkPage({ params }: PageProps) {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);

  if (!artwork) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <BackLink />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ImageGallery
          slug={artwork.slug}
          images={artwork.images}
          title={artwork.title}
        />
        <ArtworkDetails artwork={artwork} />
      </div>
    </div>
  );
}
