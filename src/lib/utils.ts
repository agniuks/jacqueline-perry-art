export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatPrice(price: string): string {
  const cleaned = price.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return price;
  return `£${num.toFixed(2)}`;
}

export function cleanTitle(ebayTitle: string): string {
  // Remove common eBay SEO suffixes/prefixes
  return ebayTitle
    .replace(/\s*-\s*(original|painting|art|artwork|canvas|framed|signed)\s*$/gi, "")
    .replace(/^(original|painting|art|artwork)\s*-\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
