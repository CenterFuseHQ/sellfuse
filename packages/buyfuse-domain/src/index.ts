import { randomUUID } from "node:crypto";
import { hasPermission, type AuthorizationContext } from "@centerfuse/auth";
import { NoopAnalytics, NoopNotifications, type AnalyticsSink, type NotificationSink } from "@centerfuse/platform";
import { z } from "zod";

export const SavedItemInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  sourceUrl: z.url().max(2000).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Source URL must use HTTP or HTTPS").optional(),
  notes: z.string().trim().max(2000).optional(),
});
export const SavedItemStatusSchema = z.enum(["CONSIDERING", "PURCHASED", "ARCHIVED"]);
export type SavedItemStatus = z.infer<typeof SavedItemStatusSchema>;
export interface SavedItem { id: string; userId: string; title: string; sourceUrl?: string; notes?: string; status: SavedItemStatus; createdAt: string; updatedAt: string; }
export interface BuyerWorkspace { userId: string; savedItems: SavedItem[]; }
export interface BuyerRepository { find(userId: string): BuyerWorkspace; save(item: SavedItem): void; updateStatus(userId: string, id: string, status: SavedItemStatus): SavedItem; }

export class InMemoryBuyerRepository implements BuyerRepository {
  private readonly items = new Map<string, SavedItem>();
  find(userId: string): BuyerWorkspace { return { userId, savedItems: [...this.items.values()].filter((item) => item.userId === userId).map((item) => structuredClone(item)) }; }
  save(item: SavedItem): void { this.items.set(item.id, structuredClone(item)); }
  updateStatus(userId: string, id: string, status: SavedItemStatus): SavedItem {
    const item = this.items.get(id);
    if (!item || item.userId !== userId) throw new Error("SAVED_ITEM_NOT_FOUND");
    const updated = { ...item, status, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    return structuredClone(updated);
  }
}

export class BuyerWorkspaceService {
  constructor(private readonly repository: BuyerRepository = new InMemoryBuyerRepository(), private readonly analytics: AnalyticsSink = new NoopAnalytics(), private readonly notifications: NotificationSink = new NoopNotifications()) {}
  get(context: AuthorizationContext): BuyerWorkspace { requirePermission(context, "BUYFUSE_WORKSPACE_READ"); return this.repository.find(context.userId); }
  async save(context: AuthorizationContext, input: unknown): Promise<SavedItem> {
    requirePermission(context, "BUYFUSE_WORKSPACE_WRITE");
    const parsed = SavedItemInputSchema.parse(input); const now = new Date().toISOString();
    const item: SavedItem = { id: randomUUID(), userId: context.userId, title: parsed.title, status: "CONSIDERING", createdAt: now, updatedAt: now, ...(parsed.sourceUrl ? { sourceUrl: parsed.sourceUrl } : {}), ...(parsed.notes ? { notes: parsed.notes } : {}) };
    this.repository.save(item);
    await this.analytics.record({ name: "saved_item.created", productId: "BUYFUSE", occurredAt: now });
    await this.notifications.send({ userId: context.userId, productId: "BUYFUSE", title: "Item saved", message: `${item.title} is in your BuyFuse workspace.`, severity: "SUCCESS" });
    return item;
  }
  updateStatus(context: AuthorizationContext, id: string, input: unknown): SavedItem { requirePermission(context, "BUYFUSE_WORKSPACE_WRITE"); return this.repository.updateStatus(context.userId, id, SavedItemStatusSchema.parse(input)); }
}

function requirePermission(context: AuthorizationContext, permission: "BUYFUSE_WORKSPACE_READ" | "BUYFUSE_WORKSPACE_WRITE"): void { if (!hasPermission(context, permission)) throw new Error("FORBIDDEN"); }
