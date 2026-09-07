import type { ItemAnalysis, MarketEvidenceInput } from "@sellfuse/validation";
import type { Valuation } from "@sellfuse/types";

const truthRules = `You are SellFuse's private, self-hosted selling assistant for ordinary people.
Return only JSON matching the supplied schema. Never invent a brand, model, condition detail, price, or market comparable.
VISIBLE means directly observable in the photos. USER_PROVIDED means explicitly present in seller notes. INFERRED is uncertain reasoning.
Put uncertainty in missingInformation. A low-confidence specific identity is worse than a clear generic identity.`;

export function identificationPrompt(sellerNotes?: string): string {
  return `${truthRules}\nAnalyze the supplied item photos. Identify the item, visible attributes and visible condition. List the information a seller must still provide. Seller notes: ${sellerNotes?.trim() || "None"}`;
}

export function valuationPrompt(
  analysis: ItemAnalysis,
  evidence: MarketEvidenceInput[],
): string {
  return `${truthRules}\nExplain which supplied evidence records are genuinely comparable to the identified item. Select only IDs from the supplied list. Do not calculate or return prices; SellFuse calculates prices deterministically from verified evidence.\nItem analysis: ${JSON.stringify(analysis)}\nSupplied evidence: ${JSON.stringify(evidence)}`;
}

export function listingPrompt(
  analysis: ItemAnalysis,
  valuation: Valuation,
  sellerNotes?: string,
): string {
  return `${truthRules}\nCreate one neutral master listing for seller review. Describe only supported facts and visible defects. Use the recommended ask only when it is non-null. Do not claim authenticity, operation, or included accessories unless supported. sellerReviewed must be false.\nAnalysis: ${JSON.stringify(analysis)}\nValuation: ${JSON.stringify(valuation)}\nSeller notes: ${sellerNotes?.trim() || "None"}`;
}

export function repairPrompt(raw: string, schemaName: string): string {
  return `${truthRules}\nRepair the following malformed ${schemaName} response into valid JSON. Preserve only supported information.\nMalformed response: ${raw.slice(0, 20_000)}`;
}
