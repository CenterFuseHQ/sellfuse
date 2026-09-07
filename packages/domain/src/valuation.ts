import type {
  ItemAnalysis,
  MarketEvidenceInput,
  PricingSuggestion,
} from "@sellfuse/validation";
import type { MarketEvidence, Valuation } from "@sellfuse/types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function valueFromEvidence(
  analysis: ItemAnalysis,
  suppliedEvidence: MarketEvidenceInput[],
  selection?: PricingSuggestion,
): Valuation {
  const allowedIds = new Set(suppliedEvidence.map((entry) => entry.id));
  const selectedIds = new Set(
    (selection?.selectedEvidenceIds ?? []).filter((id) => allowedIds.has(id)),
  );
  const selected = (
    selectedIds.size
      ? suppliedEvidence.filter((entry) => selectedIds.has(entry.id))
      : suppliedEvidence
  ).filter(
    (entry): entry is MarketEvidenceInput & { price: number } =>
      typeof entry.price === "number",
  );

  if (!selected.length) {
    const marker: MarketEvidence = {
      id: "ai-estimate-only",
      type: "AI_ESTIMATE_ONLY",
      title: analysis.likelyItem,
      sourceName: "SellFuse self-hosted model",
      observedAt: new Date().toISOString(),
      currency: "USD",
      reliability: "LOW",
      notes:
        "No price was generated because no reliable market evidence was available.",
    };
    return {
      recommendedAsk: null,
      quickSalePrice: null,
      highAskPrice: null,
      currency: "USD",
      confidence: 0,
      evidence: [marker],
      limitations: [
        "No reliable market evidence was available; enter a price manually or add verifiable comparables.",
      ],
      reasoning:
        "The model identified the item, but identification alone is not market evidence and cannot support a price.",
    };
  }

  const currencies = new Set(selected.map((entry) => entry.currency));
  if (currencies.size !== 1) {
    return {
      recommendedAsk: null,
      quickSalePrice: null,
      highAskPrice: null,
      currency: "USD",
      confidence: 0,
      evidence: selected,
      limitations: [
        "Comparable prices use multiple currencies and no verified conversion rate was supplied.",
      ],
      reasoning:
        selection?.reasoning ?? "The evidence cannot be combined safely.",
    };
  }

  const sold = selected.filter((entry) => entry.type === "SOLD_COMPARABLE");
  const active = selected.filter((entry) => entry.type === "ACTIVE_LISTING");
  const retail = selected.filter((entry) => entry.type === "RETAIL_REFERENCE");
  const user = selected.filter((entry) => entry.type === "USER_INPUT");
  let anchor: number;
  let confidence: number;
  const limitations: string[] = [];

  if (sold.length) {
    anchor = median(sold.map((entry) => entry.price));
    confidence = Math.min(0.9, 0.55 + sold.length * 0.07);
    if (sold.length < 3)
      limitations.push("Fewer than three sold comparables were available.");
  } else if (active.length) {
    anchor = median(active.map((entry) => entry.price)) * 0.9;
    confidence = Math.min(0.58, 0.3 + active.length * 0.05);
    limitations.push(
      "Active asking prices do not prove what buyers actually paid.",
    );
  } else if (retail.length) {
    anchor =
      median(retail.map((entry) => entry.price)) *
      (analysis.condition?.toLowerCase().includes("new") ? 0.7 : 0.45);
    confidence = 0.32;
    limitations.push(
      "Retail references are not resale transactions; condition and demand may materially change value.",
    );
  } else {
    anchor = median(user.map((entry) => entry.price));
    confidence = 0.2;
    limitations.push(
      "The price is based only on seller-provided input, not independent market evidence.",
    );
  }

  const recommendedAsk = roundMoney(anchor * 1.05);
  const reliabilityScore = { HIGH: 1, MEDIUM: 0.72, LOW: 0.35 } as const;
  const evidenceConfidenceCap =
    selected.reduce(
      (total, entry) => total + reliabilityScore[entry.reliability],
      0,
    ) / selected.length;
  if (evidenceConfidenceCap < 0.5)
    limitations.push("The available evidence is marked low reliability.");
  return {
    recommendedAsk,
    quickSalePrice: roundMoney(anchor * 0.85),
    highAskPrice: roundMoney(anchor * 1.2),
    currency: selected[0]!.currency,
    confidence: Math.min(
      confidence,
      selection?.confidence ?? confidence,
      analysis.confidence,
      evidenceConfidenceCap,
    ),
    evidence: selected,
    limitations,
    reasoning:
      selection?.reasoning ??
      "SellFuse calculated the range from the supplied evidence without model-generated prices.",
  };
}
