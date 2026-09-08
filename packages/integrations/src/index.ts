export const INTEGRATION_CAPABILITIES = [
  "AUTHENTICATION", "LISTINGS_READ", "LISTINGS_CREATE", "LISTINGS_UPDATE",
  "LISTINGS_DELETE", "INVENTORY_READ", "INVENTORY_UPDATE", "MEDIA_UPLOAD",
  "MESSAGES_READ", "MESSAGES_SEND", "ORDERS_READ", "ANALYTICS_READ",
] as const;

export type IntegrationCapability = (typeof INTEGRATION_CAPABILITIES)[number];
export type IntegrationAvailability = "AVAILABLE" | "PLANNED" | "MANUAL_ONLY" | "UNAVAILABLE";

export interface IntegrationProviderDescriptor {
  id: string;
  displayName: string;
  availability: IntegrationAvailability;
  capabilities: IntegrationCapability[];
  plannedCapabilities?: IntegrationCapability[];
  manualWorkflows: string[];
  disclosure: string;
}

export class ProviderRegistry<T extends IntegrationProviderDescriptor> {
  private readonly providers = new Map<string, T>();

  constructor(providers: readonly T[]) {
    for (const provider of providers) {
      if (this.providers.has(provider.id)) throw new Error(`DUPLICATE_PROVIDER:${provider.id}`);
      this.providers.set(provider.id, provider);
    }
  }

  get(id: string): T | undefined { return this.providers.get(id); }
  list(): T[] { return [...this.providers.values()]; }
  supports(id: string, capability: IntegrationCapability): boolean {
    const provider = this.providers.get(id);
    return provider?.availability === "AVAILABLE" && provider.capabilities.includes(capability) || false;
  }
}

export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    options?: { cause?: unknown },
  ) { super(message, options); this.name = "IntegrationError"; }
}

export interface RetryOptions {
  maxAttempts?: number;
  idempotencyKey: string;
  onRetry?: (error: IntegrationError, attempt: number) => void;
}

export async function withIntegrationRetry<T>(operation: (context: { attempt: number; idempotencyKey: string }) => Promise<T>, options: RetryOptions): Promise<T> {
  const maxAttempts = Math.min(Math.max(options.maxAttempts ?? 3, 1), 5);
  let lastError: IntegrationError | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return await operation({ attempt, idempotencyKey: options.idempotencyKey }); }
    catch (error) {
      lastError = error instanceof IntegrationError ? error : new IntegrationError("PROVIDER_FAILURE", "The integration provider failed.", false, { cause: error });
      if (!lastError.retryable || attempt === maxAttempts) throw lastError;
      options.onRetry?.(lastError, attempt);
    }
  }
  throw lastError ?? new IntegrationError("PROVIDER_FAILURE", "The integration provider failed.");
}
