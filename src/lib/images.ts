// Capsule photos are hotlinked from Bartesian's Shopify CDN, which resizes on request.
// Ask for roughly 2x the rendered size: grid tiles ~170px wide, so 360.

export const IMAGE_WIDTH = {
  thumb: 160,
  sheet: 240,
  tile: 360,
  pour: 600,
  hero: 800,
} as const;

export function sizedImage(url: string, width: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
}
