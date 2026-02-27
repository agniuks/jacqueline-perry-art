export interface Artwork {
  slug: string;
  title: string;
  price: string;
  description: string;
  specs: {
    medium?: string;
    dimensions?: string;
    style?: string;
    framing?: string;
    [key: string]: string | undefined;
  };
  images: string[]; // paths relative to /images/artworks/<slug>/
  ebayUrl?: string;
}
