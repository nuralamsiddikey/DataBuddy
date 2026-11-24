export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

export const products: Product[] = [
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
