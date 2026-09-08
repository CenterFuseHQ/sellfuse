import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { ProductId } from "@centerfuse/config";
import { z } from "zod";

const scrypt = promisify(scryptCallback);

export const PERMISSIONS = [
  "PROFILE_READ",
  "PROFILE_UPDATE",
  "SELLFUSE_LISTING_READ",
  "SELLFUSE_LISTING_WRITE",
  "SELLFUSE_LISTING_PUBLISH",
  "BUYFUSE_WORKSPACE_READ",
  "BUYFUSE_WORKSPACE_WRITE",
  "INTEGRATION_MANAGE",
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type EntitlementStatus = "ACTIVE" | "SUSPENDED";

export interface ProductEntitlement {
  productId: ProductId;
  status: EntitlementStatus;
  permissions: Permission[];
}

export interface AuthorizationContext {
  userId: string;
  entitlements: ProductEntitlement[];
}

interface TokenClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  entitlements: ProductEntitlement[];
}

export interface IdentityOptions {
  secret: string;
  issuer: string;
  audience: string;
  defaultEntitlements: ProductEntitlement[];
  tokenLifetimeSeconds?: number;
}

interface UserRecord {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
  entitlements: ProductEntitlement[];
}

const credentialsSchema = z.object({
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

const tokenClaimsSchema = z.object({
  sub: z.string().uuid(),
  iss: z.string().min(1),
  aud: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
  entitlements: z.array(z.object({ productId: z.enum(["CENTERFUSE", "SELLFUSE", "BUYFUSE"]), status: z.enum(["ACTIVE", "SUSPENDED"]), permissions: z.array(z.enum(PERMISSIONS)) })),
});

export class TokenService {
  constructor(private readonly options: IdentityOptions) {
    if (options.secret.length < 32) throw new Error("Authentication secret must contain at least 32 characters");
  }

  issue(userId: string, entitlements: ProductEntitlement[]): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({
      sub: userId,
      iss: this.options.issuer,
      aud: this.options.audience,
      iat: now,
      exp: now + (this.options.tokenLifetimeSeconds ?? 60 * 60 * 24),
      entitlements,
    } satisfies TokenClaims);
    const signature = createHmac("sha256", this.options.secret).update(`${header}.${payload}`).digest("base64url");
    return `${header}.${payload}.${signature}`;
  }

  verify(header: string | undefined): AuthorizationContext | null {
    if (!header?.startsWith("Bearer ")) return null;
    const parts = header.slice(7).split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
    const jwtHeader = parseJsonPart<{ alg?: string; typ?: string }>(encodedHeader);
    const parsedClaims = tokenClaimsSchema.safeParse(parseJsonPart<unknown>(encodedPayload));
    if (jwtHeader?.alg !== "HS256" || jwtHeader.typ !== "JWT" || !parsedClaims.success) return null;
    const expected = createHmac("sha256", this.options.secret).update(`${encodedHeader}.${encodedPayload}`).digest();
    const actual = Buffer.from(encodedSignature, "base64url");
    const claims = parsedClaims.data;
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || claims.iss !== this.options.issuer || claims.aud !== this.options.audience || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: claims.sub, entitlements: claims.entitlements };
  }
}

export class InMemoryIdentityService {
  private readonly users = new Map<string, UserRecord>();
  private readonly tokens: TokenService;

  constructor(private readonly options: IdentityOptions) {
    this.tokens = new TokenService(options);
  }

  async register(input: unknown): Promise<{ accessToken: string }> {
    const credentials = credentialsSchema.parse(input);
    if (this.users.has(credentials.email)) throw new Error("ACCOUNT_ALREADY_EXISTS");
    const salt = randomBytes(16).toString("base64url");
    const passwordHash = ((await scrypt(credentials.password, salt, 64)) as Buffer).toString("base64url");
    const user: UserRecord = { id: randomUUID(), email: credentials.email, salt, passwordHash, entitlements: structuredClone(this.options.defaultEntitlements) };
    this.users.set(user.email, user);
    return { accessToken: this.tokens.issue(user.id, user.entitlements) };
  }

  async login(input: unknown): Promise<{ accessToken: string }> {
    const credentials = credentialsSchema.parse(input);
    const user = this.users.get(credentials.email);
    if (!user) throw new Error("INVALID_CREDENTIALS");
    const actual = (await scrypt(credentials.password, user.salt, 64)) as Buffer;
    const expected = Buffer.from(user.passwordHash, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("INVALID_CREDENTIALS");
    return { accessToken: this.tokens.issue(user.id, user.entitlements) };
  }

  authorize(header: string | undefined, permission: Permission): AuthorizationContext | null {
    const context = this.tokens.verify(header);
    return context && hasPermission(context, permission) ? context : null;
  }

  authenticate(header: string | undefined): string | null {
    return this.tokens.verify(header)?.userId ?? null;
  }

  context(header: string | undefined): AuthorizationContext | null {
    return this.tokens.verify(header);
  }
}

export function hasPermission(context: AuthorizationContext, permission: Permission): boolean {
  return context.entitlements.some((entitlement) => entitlement.status === "ACTIVE" && entitlement.permissions.includes(permission));
}

export const sellFuseEntitlement: ProductEntitlement = {
  productId: "SELLFUSE",
  status: "ACTIVE",
  permissions: ["PROFILE_READ", "PROFILE_UPDATE", "SELLFUSE_LISTING_READ", "SELLFUSE_LISTING_WRITE", "SELLFUSE_LISTING_PUBLISH", "INTEGRATION_MANAGE"],
};

export const buyFuseEntitlement: ProductEntitlement = {
  productId: "BUYFUSE",
  status: "ACTIVE",
  permissions: ["PROFILE_READ", "PROFILE_UPDATE", "BUYFUSE_WORKSPACE_READ", "BUYFUSE_WORKSPACE_WRITE"],
};

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parseJsonPart<T>(part: string): T | null {
  try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T; } catch { return null; }
}
