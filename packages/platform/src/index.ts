import type { ProductId } from "@centerfuse/config";

export interface AnalyticsEvent { name: string; productId: ProductId; occurredAt: string; properties?: Record<string, string | number | boolean>; }
export interface AnalyticsSink { record(event: AnalyticsEvent): void | Promise<void>; }
export class NoopAnalytics implements AnalyticsSink { record(_event: AnalyticsEvent): void {} }
export class InMemoryAnalytics implements AnalyticsSink { readonly events: AnalyticsEvent[] = []; record(event: AnalyticsEvent): void { this.events.push(structuredClone(event)); } }

export interface Notification { userId: string; productId: ProductId; title: string; message: string; severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR"; }
export interface NotificationSink { send(notification: Notification): void | Promise<void>; }
export class NoopNotifications implements NotificationSink { send(_notification: Notification): void {} }
export class InMemoryNotifications implements NotificationSink { readonly notifications: Notification[] = []; send(notification: Notification): void { this.notifications.push(structuredClone(notification)); } }

export interface FeatureFlagProvider { enabled(flag: string, context: { userId?: string; productId: ProductId }): boolean; }
export class StaticFeatureFlags implements FeatureFlagProvider {
  constructor(private readonly flags: Readonly<Record<string, boolean>> = {}) {}
  enabled(flag: string, _context: { userId?: string; productId: ProductId }): boolean { return this.flags[flag] ?? false; }
}
