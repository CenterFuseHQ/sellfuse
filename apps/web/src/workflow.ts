export const SELLFUSE_STEPS = [
  "Take pictures",
  "Identify item",
  "Review details",
  "Check market evidence",
  "Choose a price",
  "Choose marketplaces",
  "Review drafts",
  "Publish",
  "Mark sold once",
] as const;

export interface IntelligenceViewModel {
  priceHeading: string;
  evidenceLabel: string;
  reviewRequired: true;
  manualEntryAvailable: true;
}

export function intelligenceViewModel(
  hasReliableEvidence: boolean,
): IntelligenceViewModel {
  return {
    priceHeading: hasReliableEvidence
      ? "Evidence-backed price guidance"
      : "Price needs your input",
    evidenceLabel: hasReliableEvidence
      ? "See the market evidence behind this range"
      : "No reliable market evidence was found",
    reviewRequired: true,
    manualEntryAvailable: true,
  };
}
