export const PRODUCT_IDS = ["CENTERFUSE", "SELLFUSE", "BUYFUSE"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];
export type ProductType = "PARENT" | "SELLER" | "BUYER";

export interface ProductMetadata {
  id: ProductId;
  name: "CenterFuse" | "SellFuse" | "BuyFuse";
  productType: ProductType;
  shortDescription: string;
  accent: string;
  themeColor: string;
  defaultUrl: string;
  defaultPort: number;
}

export const PRODUCTS: Readonly<Record<ProductId, ProductMetadata>> = {
  CENTERFUSE: {
    id: "CENTERFUSE",
    name: "CenterFuse",
    productType: "PARENT",
    shortDescription: "A connected home for practical commerce products.",
    accent: "#3156d8",
    themeColor: "#101b3f",
    defaultUrl: "http://localhost:3000",
    defaultPort: 3000,
  },
  SELLFUSE: {
    id: "SELLFUSE",
    name: "SellFuse",
    productType: "SELLER",
    shortDescription: "Prepare one trusted listing for the places you sell.",
    accent: "#df5732",
    themeColor: "#173f2d",
    defaultUrl: "http://localhost:3001",
    defaultPort: 3001,
  },
  BUYFUSE: {
    id: "BUYFUSE",
    name: "BuyFuse",
    productType: "BUYER",
    shortDescription: "Keep the things you are considering organized in one place.",
    accent: "#7658d6",
    themeColor: "#30245e",
    defaultUrl: "http://localhost:3002",
    defaultPort: 3002,
  },
};

export type ProductUrls = Readonly<Record<ProductId, string>>;

export function resolveProductUrls(
  env: Record<string, string | undefined>,
): ProductUrls {
  return {
    CENTERFUSE: normalizeUrl(env.CENTERFUSE_URL, PRODUCTS.CENTERFUSE.defaultUrl),
    SELLFUSE: normalizeUrl(env.SELLFUSE_URL, PRODUCTS.SELLFUSE.defaultUrl),
    BUYFUSE: normalizeUrl(env.BUYFUSE_URL, PRODUCTS.BUYFUSE.defaultUrl),
  };
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const parsed = new URL(value?.trim() || fallback);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Product URLs must use HTTP or HTTPS");
  return parsed.toString().replace(/\/$/, "");
}
