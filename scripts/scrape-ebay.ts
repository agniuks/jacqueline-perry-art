import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ListingStub {
  title: string;
  price: string;
  thumbnailUrl: string;
  itemUrl: string;
}

interface Artwork {
  slug: string;
  title: string;
  price: string;
  description: string;
  specs: Record<string, string>;
  images: string[];
  ebayUrl: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanTitle(ebayTitle: string): string {
  return ebayTitle
    .replace(/\bNEW\b/gi, "")
    .replace(/\bORIGINAL\b/gi, "")
    .replace(/\bFREE (P&P|SHIPPING|POSTAGE|DELIVERY)\b/gi, "")
    .replace(/\bSIGNED\b/gi, "")
    .replace(/\bby Jacqueline Perry\b/gi, "")
    .replace(/\bJacqueline Perry\b/gi, "")
    .replace(/\s*-\s*$/, "")
    .replace(/^\s*-\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function randomDelay(): Promise<void> {
  const ms = 2000 + Math.random() * 3000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;

    client
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          downloadFile(response.headers.location, dest).then(resolve, reject);
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

// ─── Phase 1: Scrape seller listing page ────────────────────────────────────

async function scrapeListings(page: Page): Promise<ListingStub[]> {
  const allListings: ListingStub[] = [];

  // Navigate to seller profile first
  const profileUrl = "https://www.ebay.co.uk/usr/jacquelineperryart";
  console.log(`Navigating to seller profile: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  // Find items link
  const itemsLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"));
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || "";
      const href = link.href || "";
      if (
        (text.includes("see all") || text.includes("items for sale") || text.includes("all items")) &&
        href.includes("ebay")
      ) {
        return href;
      }
    }
    return null;
  });

  if (itemsLink) {
    console.log(`Found items link: ${itemsLink}`);
    await page.goto(itemsLink, { waitUntil: "domcontentloaded", timeout: 60000 });
  } else {
    const searchUrl = "https://www.ebay.co.uk/sch/i.html?_ssn=jacquelineperryart&_ipg=240";
    console.log(`Trying direct search: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  }

  await page.waitForTimeout(5000);
  console.log(`Current URL: ${page.url()}`);

  // Wait for cards to load
  try {
    await page.waitForSelector(".s-card", { timeout: 15000 });
  } catch {
    console.log("Could not find .s-card items, waiting for user...");
    await page.waitForSelector(".s-card", { timeout: 300000 });
  }

  // Scrape all pages
  let pageNum = 1;
  while (true) {
    console.log(`\nScraping page ${pageNum}...`);

    const listings = await page.evaluate(() => {
      const items: {
        title: string;
        price: string;
        thumbnailUrl: string;
        itemUrl: string;
      }[] = [];

      // eBay now uses .s-card elements
      document.querySelectorAll("li.s-card").forEach((card) => {
        // Get the title from the header link
        const headerLink = card.querySelector(".su-card-container__header a.s-card__link, .s-card__title a");
        const title = headerLink?.textContent?.trim() || "";

        // Skip placeholder "Shop on eBay" cards
        if (!title || title === "Shop on eBay" || title.startsWith("Shop on")) return;

        // Get the item URL - prefer the real item link (ebay.co.uk/itm/...)
        const allLinks = card.querySelectorAll("a.s-card__link");
        let itemUrl = "";
        allLinks.forEach((link) => {
          const href = (link as HTMLAnchorElement).href || "";
          if (href.includes("/itm/") && href.includes("ebay.co.uk")) {
            itemUrl = href;
          } else if (!itemUrl && href.includes("/itm/")) {
            itemUrl = href;
          }
        });
        if (!itemUrl) return;

        // Get price
        const priceEl = card.querySelector(".s-card__price .s-card__price--main, .s-card__price, [class*='price']");
        const price = priceEl?.textContent?.trim() || "";

        // Get thumbnail
        const img = card.querySelector("img.s-card__image, img[src*='ebayimg']");
        const thumbnailUrl = (img as HTMLImageElement)?.src || img?.getAttribute("data-src") || "";

        items.push({ title, price, thumbnailUrl, itemUrl });
      });

      return items;
    });

    console.log(`  Found ${listings.length} listings on page ${pageNum}`);
    allListings.push(...listings);

    // Check for next page
    const nextLink = await page.evaluate(() => {
      const nextBtn =
        (document.querySelector('a.pagination__next') as HTMLAnchorElement) ||
        (document.querySelector('a[aria-label="Next page"]') as HTMLAnchorElement) ||
        (document.querySelector('nav a[rel="next"]') as HTMLAnchorElement);
      return nextBtn?.href || null;
    });

    if (!nextLink) {
      console.log("  No more pages.");
      break;
    }

    console.log(`  Next page: ${nextLink}`);
    await randomDelay();
    await page.goto(nextLink, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    pageNum++;
  }

  return allListings;
}

// ─── Phase 2: Scrape individual listing pages ───────────────────────────────

async function scrapeDetail(
  page: Page,
  stub: ListingStub,
  imagesDir: string
): Promise<Artwork | null> {
  const displayTitle = cleanTitle(stub.title);
  const slug = generateSlug(displayTitle);

  console.log(`\nScraping: ${displayTitle}`);
  console.log(`  URL: ${stub.itemUrl}`);

  try {
    await page.goto(stub.itemUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    // Extract image URLs
    const imageUrls: string[] = await page.evaluate(() => {
      const urls: string[] = [];

      // Method 1: ux-image-carousel
      document.querySelectorAll(".ux-image-carousel-item img").forEach((img) => {
        const src =
          (img as HTMLImageElement).src ||
          img.getAttribute("data-zoom-src") ||
          img.getAttribute("data-src") ||
          "";
        if (src && !src.includes("s-l64") && src.includes("ebayimg")) {
          urls.push(src.replace(/s-l\d+/g, "s-l1600"));
        }
      });

      // Method 2: gallery buttons
      if (urls.length === 0) {
        document.querySelectorAll("button[data-idx] img, .ux-image-filmstrip img").forEach((img) => {
          const src = (img as HTMLImageElement).src || img.getAttribute("data-src") || "";
          if (src && src.includes("ebayimg")) {
            urls.push(src.replace(/s-l\d+/g, "s-l1600"));
          }
        });
      }

      // Method 3: main image
      if (urls.length === 0) {
        const mainImg = document.querySelector(
          "#icImg, .ux-image-magnify__container img, img[itemprop='image']"
        ) as HTMLImageElement | null;
        if (mainImg?.src && mainImg.src.includes("ebayimg")) {
          urls.push(mainImg.src.replace(/s-l\d+/g, "s-l1600"));
        }
      }

      // Method 4: any large eBay image
      if (urls.length === 0) {
        document.querySelectorAll("img[src*='ebayimg']").forEach((img) => {
          const el = img as HTMLImageElement;
          if (el.src && (el.naturalWidth > 200 || el.src.includes("s-l500") || el.src.includes("s-l1600"))) {
            urls.push(el.src.replace(/s-l\d+/g, "s-l1600"));
          }
        });
      }

      return [...new Set(urls)];
    });

    console.log(`  Found ${imageUrls.length} images`);

    // Extract description
    let description = await page.evaluate(() => {
      const selectors = [
        ".x-item-description-child",
        "[data-testid='x-item-description']",
        "#desc_div",
        ".item-description",
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent?.trim();
          if (text && text.length > 10) return text;
        }
      }
      return "";
    });

    // Try iframe description
    if (!description) {
      try {
        const iframeHandle = await page.$('iframe#desc_ifr, iframe[name="desc_ifr"], iframe[src*="vi/description"]');
        if (iframeHandle) {
          const frame = await iframeHandle.contentFrame();
          if (frame) {
            await frame.waitForLoadState("domcontentloaded").catch(() => {});
            description = await frame.evaluate(() => document.body?.textContent?.trim() || "");
          }
        }
      } catch {
        // iframe not available
      }
    }

    // Extract item specifics
    const specs: Record<string, string> = await page.evaluate(() => {
      const result: Record<string, string> = {};

      document.querySelectorAll(".ux-labels-values").forEach((section) => {
        const labelEl = section.querySelector(".ux-labels-values__labels .ux-textspans");
        const valueEl = section.querySelector(".ux-labels-values__values .ux-textspans");
        if (!labelEl || !valueEl) return;

        const key = labelEl.textContent?.trim().replace(/:$/, "") || "";
        const value = valueEl.textContent?.trim() || "";
        if (!key || !value || value === "N/A") return;

        const k = key.toLowerCase();
        if (k.includes("medium") || k.includes("material")) result["medium"] = value;
        else if (k.includes("dimension") || k.includes("size")) result["dimensions"] = value;
        else if (k.includes("style")) result["style"] = value;
        else if (k.includes("frame") || k.includes("framing")) result["framing"] = value;
        else if (k.includes("type") || k.includes("subject")) result[key.toLowerCase()] = value;
      });

      return result;
    });

    // Download images
    const artworkDir = path.join(imagesDir, slug);
    if (!fs.existsSync(artworkDir)) {
      fs.mkdirSync(artworkDir, { recursive: true });
    }

    const downloadedImages: string[] = [];
    const urlsToDownload =
      imageUrls.length > 0
        ? imageUrls
        : stub.thumbnailUrl
          ? [stub.thumbnailUrl.replace(/s-l\d+/g, "s-l1600").replace(/\.webp$/, ".jpg")]
          : [];

    for (let i = 0; i < urlsToDownload.length; i++) {
      const ext = urlsToDownload[i].includes(".webp") ? "webp" : "jpg";
      const filename = i === 0 ? `main.${ext}` : `detail-${i}.${ext}`;
      const destPath = path.join(artworkDir, filename);

      try {
        await downloadFile(urlsToDownload[i], destPath);
        const stat = fs.statSync(destPath);
        if (stat.size > 1000) {
          downloadedImages.push(filename);
          console.log(`  Downloaded: ${filename} (${Math.round(stat.size / 1024)}KB)`);
        } else {
          fs.unlinkSync(destPath);
        }
      } catch (err) {
        console.error(`  Failed to download image ${i}:`, (err as Error).message);
      }
    }

    if (downloadedImages.length === 0) {
      console.warn(`  ⚠️  No images for "${displayTitle}", skipping`);
      return null;
    }

    // Format price
    let price = stub.price;
    if (price) {
      const gbpMatch = price.match(/£[\d,.]+/);
      const usdMatch = price.match(/\$[\d,.]+/);
      if (gbpMatch) price = gbpMatch[0];
      else if (usdMatch) price = usdMatch[0];
    }

    return {
      slug,
      title: displayTitle,
      price,
      description: description || "",
      specs,
      images: downloadedImages,
      ebayUrl: stub.itemUrl,
    };
  } catch (err) {
    console.error(`  ❌ Error scraping ${stub.itemUrl}:`, (err as Error).message);
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const imagesDir = path.join(projectRoot, "public", "images", "artworks");
  const dataDir = path.join(projectRoot, "data");
  const outputPath = path.join(dataDir, "artworks.json");

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log("🎨 Jacqueline Perry Art — eBay Scraper");
  console.log("======================================\n");

  const browser: Browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-GB",
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  try {
    // Phase 1
    console.log("Phase 1: Scraping seller listing page...\n");
    const listings = await scrapeListings(page);
    console.log(`\n✅ Found ${listings.length} total listings\n`);

    if (listings.length === 0) {
      console.error("❌ No listings found.");
      await browser.close();
      process.exit(1);
    }

    // Log first few listings for verification
    console.log("First 3 listings:");
    listings.slice(0, 3).forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.title} — ${l.price}`);
      console.log(`     ${l.itemUrl.slice(0, 80)}`);
    });

    // Phase 2
    console.log("\nPhase 2: Scraping individual listing pages...\n");
    const artworks: Artwork[] = [];

    for (let i = 0; i < listings.length; i++) {
      console.log(`\n[${i + 1}/${listings.length}]`);
      const artwork = await scrapeDetail(page, listings[i], imagesDir);
      if (artwork) {
        artworks.push(artwork);

        // Save progress incrementally
        const uniqueSoFar = Array.from(
          new Map(artworks.map((a) => [a.slug, a])).values()
        );
        fs.writeFileSync(outputPath, JSON.stringify(uniqueSoFar, null, 2));
      }

      if (i < listings.length - 1) {
        await randomDelay();
      }
    }

    const uniqueArtworks = Array.from(
      new Map(artworks.map((a) => [a.slug, a])).values()
    );

    fs.writeFileSync(outputPath, JSON.stringify(uniqueArtworks, null, 2));
    console.log(`\n✅ Saved ${uniqueArtworks.length} artworks to ${outputPath}`);
    console.log(`📁 Images saved to ${imagesDir}`);
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await browser.close();
  }
}

main();
