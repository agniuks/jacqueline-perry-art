import * as fs from "fs";
import * as path from "path";
import { Artwork } from "./types";

function loadArtworks(): Artwork[] {
  const filePath = path.join(process.cwd(), "data", "artworks.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Artwork[];
}

const artworks: Artwork[] = loadArtworks();

export function getAllArtworks(): Artwork[] {
  return artworks;
}

export function getArtworkBySlug(slug: string): Artwork | undefined {
  return artworks.find((a) => a.slug === slug);
}

export function getArtworkSlugs(): string[] {
  return artworks.map((a) => a.slug);
}
