import { z } from "zod";
import { MARKETPLACES } from "@sellfuse/types";

export const MarketplaceSchema = z.enum(MARKETPLACES);
export const ConfidenceSchema = z.number().min(0).max(1);

export const EvidenceTypeSchema = z.enum([
  "SOLD_COMPARABLE",
  "ACTIVE_LISTING",
  "RETAIL_REFERENCE",
  "USER_INPUT",
  "AI_ESTIMATE_ONLY",
]);
export const MarketEvidenceSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: EvidenceTypeSchema,
    title: z.string().min(1).max(300),
    sourceName: z.string().min(1).max(120),
    sourceUrl: z.url().optional(),
    observedAt: z.iso.datetime(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3),
    condition: z.string().max(120).optional(),
    reliability: z.enum(["HIGH", "MEDIUM", "LOW"]),
    notes: z.string().max(500).optional(),
  })
  .superRefine((evidence, context) => {
    if (
      ["SOLD_COMPARABLE", "ACTIVE_LISTING", "RETAIL_REFERENCE"].includes(
        evidence.type,
      )
    ) {
      if (evidence.price === undefined)
        context.addIssue({
          code: "custom",
          message: `${evidence.type} requires a price`,
          path: ["price"],
        });
      if (!evidence.sourceUrl)
        context.addIssue({
          code: "custom",
          message: `${evidence.type} requires a source URL`,
          path: ["sourceUrl"],
        });
    }
    if (evidence.type === "AI_ESTIMATE_ONLY" && evidence.price !== undefined)
      context.addIssue({
        code: "custom",
        message: "AI_ESTIMATE_ONLY cannot carry a price",
        path: ["price"],
      });
  });

export const ValuationSchema = z.object({
  recommendedAsk: z.number().nonnegative().nullable(),
  quickSalePrice: z.number().nonnegative().nullable(),
  highAskPrice: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  confidence: ConfidenceSchema,
  evidence: z.array(MarketEvidenceSchema).max(100),
  limitations: z.array(z.string().min(1).max(500)).max(30),
  reasoning: z.string().min(1).max(2000),
});

export const ImageInputSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(16),
  name: z.string().min(1).max(140).optional(),
});

export const EvidenceFactSchema = z.object({
  field: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
  source: z.enum(["VISIBLE", "USER_PROVIDED", "INFERRED"]),
  confidence: ConfidenceSchema,
});

export const ItemAnalysisSchema = z.object({
  likelyItem: z.string().min(1).max(160),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(100),
  condition: z.string().min(1).max(80).optional(),
  visibleDamage: z.array(z.string().max(300)).max(20),
  attributes: z.record(z.string().max(80), z.string().max(500)),
  confidence: ConfidenceSchema,
  missingInformation: z.array(z.string().max(300)).max(30),
  evidence: z.array(EvidenceFactSchema).max(50),
});

export const MasterListingSchema = z.object({
  title: z.string().min(3).max(160),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(100),
  condition: z.string().min(1).max(80).optional(),
  description: z.string().min(10).max(5000),
  notableFeatures: z.array(z.string().max(300)).max(30),
  defects: z.array(z.string().max(300)).max(30),
  dimensions: z.string().max(200).optional(),
  estimatedRetailValue: z.number().nonnegative().optional(),
  suggestedPrice: z.number().nonnegative().optional(),
  priceRange: z
    .object({ low: z.number().nonnegative(), high: z.number().nonnegative() })
    .refine((v) => v.high >= v.low)
    .optional(),
  searchKeywords: z.array(z.string().max(80)).max(30),
  fulfillment: z.enum(["PICKUP", "SHIPPING", "BOTH"]),
  quantity: z.number().int().min(1).max(999),
  location: z.string().max(160).optional(),
  missingInformation: z.array(z.string().max(300)).max(30),
  sellerReviewed: z.boolean(),
});

export const MarketplaceListingDraftSchema = z.object({
  marketplace: MarketplaceSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  category: z.string().min(1).max(160),
  price: z.number().nonnegative(),
  hashtags: z.array(z.string().max(80)).max(30),
  shipping: z.boolean(),
  pickup: z.boolean(),
  warnings: z.array(z.string().max(300)).max(20),
});

export const PhotoQualitySchema = z.object({
  overallScore: ConfidenceSchema,
  blurRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  lighting: z.enum(["POOR", "FAIR", "GOOD"]),
  issues: z.array(z.string().max(300)).max(20),
  suggestions: z.array(z.string().max(300)).max(20),
  conditionNotAltered: z.literal(true),
});

export const PricingSuggestionSchema = z
  .object({
    selectedEvidenceIds: z.array(z.string().min(1).max(200)).max(100),
    reasoning: z.string().min(1).max(1500),
    confidence: ConfidenceSchema,
  })
  .strict();

export const ListingCreateSchema = z.object({
  masterListing: MasterListingSchema,
  marketplaces: z.array(MarketplaceSchema).max(MARKETPLACES.length).default([]),
});

export const PublishSelectionSchema = z.object({
  marketplaces: z
    .array(MarketplaceSchema)
    .min(1, "Select at least one marketplace")
    .max(MARKETPLACES.length),
});

export const AnalyzeItemRequestSchema = z.object({
  photos: z.array(ImageInputSchema).min(1).max(8),
  sellerNotes: z.string().max(2000).optional(),
});

export const RegisterSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

export const LoginSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export type ItemAnalysis = z.infer<typeof ItemAnalysisSchema>;
export type PhotoQuality = z.infer<typeof PhotoQualitySchema>;
export type PricingSuggestion = z.infer<typeof PricingSuggestionSchema>;
export type MarketEvidenceInput = z.infer<typeof MarketEvidenceSchema>;
export type ImageInput = z.infer<typeof ImageInputSchema>;

export function assertValidImages(
  images: ImageInput[],
  maxBytes: number,
  maxImages = 8,
): void {
  if (images.length > maxImages) throw new Error("IMAGE_COUNT_LIMIT");
  for (const image of images) {
    let bytes: Buffer;
    try {
      bytes = Buffer.from(image.base64, "base64");
    } catch {
      throw new Error("INVALID_IMAGE_ENCODING");
    }
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes)
      throw new Error("IMAGE_SIZE_LIMIT");
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isWebp =
      bytes.length > 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP";
    const matches =
      image.mimeType === "image/jpeg"
        ? isJpeg
        : image.mimeType === "image/png"
          ? isPng
          : isWebp;
    if (!matches) throw new Error("IMAGE_SIGNATURE_MISMATCH");
  }
}
