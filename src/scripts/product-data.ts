import { z } from "zod";
import { ProductSchema, type Product } from "../modules/products/product.schema.js";
import { createRandom } from "./random.js";

export const TOTAL_PRODUCTS = 1000;

// The handpicked starter catalog (ids 1-15). Kept as-is so existing rows don't change.
const STARTER_PRODUCTS: Product[] = [
  { id: 1, name: "UltraBook Pro 14", category: "laptops", price: 1299.99, rating: 4.7, inStock: true },
  { id: 2, name: "BudgetBook 15", category: "laptops", price: 449.0, rating: 3.9, inStock: true },
  { id: 3, name: "GameStation X", category: "laptops", price: 1899.5, rating: 4.8, inStock: false },
  { id: 4, name: "Nova Phone 12", category: "phones", price: 799.0, rating: 4.5, inStock: true },
  { id: 5, name: "Nova Phone Lite", category: "phones", price: 299.0, rating: 4.1, inStock: true },
  { id: 6, name: "Pixel Zoom Max", category: "phones", price: 1099.0, rating: 4.6, inStock: false },
  { id: 7, name: "NoiseAway Headphones", category: "audio", price: 199.99, rating: 4.4, inStock: true },
  { id: 8, name: "PocketBeat Earbuds", category: "audio", price: 49.9, rating: 4.0, inStock: true },
  { id: 9, name: "BoomBox Speaker", category: "audio", price: 89.0, rating: 4.2, inStock: true },
  { id: 10, name: "ClickPro Wireless Mouse", category: "accessories", price: 24.5, rating: 4.3, inStock: true },
  { id: 11, name: "MechType Keyboard", category: "accessories", price: 119.0, rating: 4.6, inStock: true },
  { id: 12, name: "USB-C Hub 7-in-1", category: "accessories", price: 39.99, rating: 3.8, inStock: false },
  { id: 13, name: "SnapCam 4K Webcam", category: "accessories", price: 79.0, rating: 4.1, inStock: true },
  { id: 14, name: "Vision 27 Monitor", category: "monitors", price: 329.0, rating: 4.5, inStock: true },
  { id: 15, name: "Vision 32 Curved Monitor", category: "monitors", price: 549.0, rating: 4.7, inStock: true },
];

interface CategorySpec {
  brands: string[];
  lines: string[];
  types: string[];
  minPrice: number;
  maxPrice: number;
}

const CATEGORIES: Record<string, CategorySpec> = {
  laptops: {
    brands: ["UltraBook", "BudgetBook", "GameStation", "WorkMate", "AeroBook", "Titan"],
    lines: ["Pro", "Air", "Lite", "Max", "Elite", "Studio"],
    types: ["Laptop", "Notebook", "Ultrabook", "Gaming Laptop", "2-in-1 Laptop"],
    minPrice: 349,
    maxPrice: 2799,
  },
  phones: {
    brands: ["Nova", "Pixel", "Orbit", "Zenith", "Aura", "Volt"],
    lines: ["Lite", "Plus", "Max", "Ultra", "Mini", "Edge"],
    types: ["Phone", "Smartphone", "5G Phone", "Rugged Phone"],
    minPrice: 129,
    maxPrice: 1599,
  },
  audio: {
    brands: ["NoiseAway", "PocketBeat", "BoomBox", "SoundWave", "EchoPro", "BassLab"],
    lines: ["Studio", "Sport", "Classic", "Pro", "Go", "Air"],
    types: ["Headphones", "Earbuds", "Speaker", "Soundbar", "Wireless Headset"],
    minPrice: 19,
    maxPrice: 499,
  },
  accessories: {
    brands: ["ClickPro", "MechType", "SnapCam", "PortHub", "GripTech", "CableCo"],
    lines: ["Basic", "Pro", "Compact", "Ergo", "Turbo", "Slim"],
    types: ["Wireless Mouse", "Mechanical Keyboard", "USB-C Hub", "Webcam", "Laptop Stand", "Charger", "Backpack"],
    minPrice: 9,
    maxPrice: 249,
  },
  monitors: {
    brands: ["Vision", "ViewMax", "Pixelon", "ClearView", "Panora", "Lumen"],
    lines: ["Curved", "Ultra", "Pro", "Flex", "Gaming", "Office"],
    types: ['24" Monitor', '27" Monitor', '32" Monitor', '34" Ultrawide Monitor', '4K Monitor'],
    minPrice: 119,
    maxPrice: 1299,
  },
};

function generateProducts(startId: number, count: number, takenNames: Set<string>): Product[] {
  const random = createRandom(20260101);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!;
  const categories = Object.keys(CATEGORIES);

  const products: Product[] = [];
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length]!; // even spread across categories
    const spec = CATEGORIES[category]!;

    let name: string;
    do {
      const model = 100 + Math.floor(random() * 900);
      name = `${pick(spec.brands)} ${pick(spec.lines)} ${pick(spec.types)} ${model}`;
    } while (takenNames.has(name));
    takenNames.add(name);

    // Skew prices low (most products are mid/budget), end most of them in .99
    const base = spec.minPrice + random() ** 1.6 * (spec.maxPrice - spec.minPrice);
    const price = Math.max(spec.minPrice, Math.round(base)) - (random() < 0.7 ? 0.01 : 0);

    products.push({
      id: startId + i,
      name,
      category,
      price: Math.round(price * 100) / 100,
      rating: Math.min(5, Math.round((3 + 2 * random() ** 0.6) * 10) / 10),
      inStock: random() < 0.8,
    });
  }
  return products;
}

// Validated once at load, so a typo in the catalog fails fast.
export const productSeedData: Product[] = z.array(ProductSchema).parse([
  ...STARTER_PRODUCTS,
  ...generateProducts(
    STARTER_PRODUCTS.length + 1,
    TOTAL_PRODUCTS - STARTER_PRODUCTS.length,
    new Set(STARTER_PRODUCTS.map((p) => p.name)),
  ),
]);
