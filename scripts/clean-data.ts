import * as fs from "fs";
import * as path from "path";

interface Artwork {
  slug: string;
  title: string;
  price: string;
  description: string;
  specs: Record<string, string>;
  images: string[];
  ebayUrl: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanTitle(title: string): string {
  return title
    // Remove eBay UI text
    .replace(/Opens in a new window or tab/gi, "")
    .replace(/Opens in a window or tab/gi, "")
    .replace(/New listing/gi, "")
    // Remove common eBay SEO words
    .replace(/\bNEW\b/gi, "")
    .replace(/\bORIGINAL\b/gi, "")
    .replace(/\bFREE (P&P|SHIPPING|POSTAGE|DELIVERY)\b/gi, "")
    .replace(/\bSIGNED\b/gi, "")
    .replace(/\bby Jacqueline Perry\b/gi, "")
    .replace(/\bJacqueline Perry\b/gi, "")
    .replace(/\bUnique Gift\b/gi, "")
    .replace(/\bUnique\b/gi, "")
    .replace(/\bOpens\b$/gi, "")
    // Clean up punctuation/spacing
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s*-\s*$/, "")
    .replace(/^\s*-\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanDescription(desc: string): string {
  if (!desc) return "";

  // Remove eBay JavaScript/JSON junk
  const jsIndex = desc.indexOf("/* ssgST:");
  if (jsIndex !== -1) {
    desc = desc.slice(0, jsIndex);
  }

  // Also remove $M_ junk
  const mIndex = desc.indexOf("$M_");
  if (mIndex !== -1) {
    desc = desc.slice(0, mIndex);
  }

  // Remove any remaining JSON blobs
  desc = desc.replace(/\{["\s]*_type["\s]*:[\s\S]*$/g, "");

  // Clean up HTML artifacts
  desc = desc
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Limit to reasonable length - take just the main description paragraph(s)
  if (desc.length > 1000) {
    desc = desc.slice(0, 1000);
    // Cut at last sentence boundary
    const lastPeriod = desc.lastIndexOf(".");
    if (lastPeriod > 200) {
      desc = desc.slice(0, lastPeriod + 1);
    }
  }

  return desc;
}

const projectRoot = path.resolve(__dirname, "..");
const dataPath = path.join(projectRoot, "data", "artworks.json");
const imagesDir = path.join(projectRoot, "public", "images", "artworks");

const raw = fs.readFileSync(dataPath, "utf-8");
const artworks: Artwork[] = JSON.parse(raw);

console.log(`Processing ${artworks.length} artworks...\n`);

// Track slug renames for directory moves
const renames: { oldSlug: string; newSlug: string }[] = [];

const cleaned = artworks.map((artwork) => {
  const newTitle = cleanTitle(artwork.title);
  const newSlug = generateSlug(newTitle);
  const newDesc = cleanDescription(artwork.description);

  if (artwork.slug !== newSlug) {
    renames.push({ oldSlug: artwork.slug, newSlug });
  }

  return {
    ...artwork,
    title: newTitle,
    slug: newSlug,
    description: newDesc,
  };
});

// Deduplicate by slug (keep first occurrence)
const uniqueMap = new Map<string, Artwork>();
for (const art of cleaned) {
  if (!uniqueMap.has(art.slug)) {
    uniqueMap.set(art.slug, art);
  }
}
const unique = Array.from(uniqueMap.values());

console.log(`Unique artworks after dedup: ${unique.length} (from ${cleaned.length})`);

// Rename image directories
let renameCount = 0;
for (const { oldSlug, newSlug } of renames) {
  const oldDir = path.join(imagesDir, oldSlug);
  const newDir = path.join(imagesDir, newSlug);

  if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
    fs.renameSync(oldDir, newDir);
    renameCount++;
  } else if (fs.existsSync(oldDir) && fs.existsSync(newDir)) {
    // Both exist - merge or skip
    console.log(`  Skipping rename (target exists): ${oldSlug} -> ${newSlug}`);
  }
}
console.log(`Renamed ${renameCount} image directories`);

// Remove image directories for artworks that were deduped away
const validSlugs = new Set(unique.map((a) => a.slug));
if (fs.existsSync(imagesDir)) {
  const dirs = fs.readdirSync(imagesDir);
  let removedCount = 0;
  for (const dir of dirs) {
    if (!validSlugs.has(dir)) {
      const fullPath = path.join(imagesDir, dir);
      if (fs.statSync(fullPath).isDirectory()) {
        // Don't remove, just note it
        console.log(`  Orphaned directory: ${dir}`);
        removedCount++;
      }
    }
  }
  if (removedCount > 0) {
    console.log(`Found ${removedCount} orphaned image directories (not removed)`);
  }
}

// Write cleaned data
fs.writeFileSync(dataPath, JSON.stringify(unique, null, 2));
console.log(`\nSaved ${unique.length} cleaned artworks to ${dataPath}`);

// Print sample
console.log("\nSample titles:");
unique.slice(0, 5).forEach((a) => {
  console.log(`  - ${a.title} (${a.price})`);
  console.log(`    Slug: ${a.slug}`);
  console.log(`    Desc: ${a.description.slice(0, 100)}...`);
});
