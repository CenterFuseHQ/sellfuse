import {
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { LoginSchema, RegisterSchema } from "@sellfuse/validation";

const scrypt = promisify(scryptCallback);
const issuer = "sellfuse";
const audience = "sellfuse-api";

interface UserRecord {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
}

interface TokenClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parseJsonPart<T>(part: string): T | null {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export class AuthService {
  private readonly usersByEmail = new Map<string, UserRecord>();

  constructor(private readonly secret: string) {
    if (secret.length < 32)
      throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  async register(input: unknown): Promise<{ accessToken: string }> {
    const credentials = RegisterSchema.parse(input);
    if (this.usersByEmail.has(credentials.email))
      throw new Error("ACCOUNT_ALREADY_EXISTS");
    const salt = randomBytes(16).toString("base64url");
    const hash = (await scrypt(credentials.password, salt, 64)) as Buffer;
    const user: UserRecord = {
      id: randomUUID(),
      email: credentials.email,
      salt,
      passwordHash: hash.toString("base64url"),
    };
    this.usersByEmail.set(user.email, user);
    return { accessToken: this.issue(user.id) };
  }

  async login(input: unknown): Promise<{ accessToken: string }> {
    const credentials = LoginSchema.parse(input);
    const user = this.usersByEmail.get(credentials.email);
    if (!user) throw new Error("INVALID_CREDENTIALS");
    const actual = (await scrypt(
      credentials.password,
      user.salt,
      64,
    )) as Buffer;
    const expected = Buffer.from(user.passwordHash, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error("INVALID_CREDENTIALS");
    return { accessToken: this.issue(user.id) };
  }

  authenticate(header: string | undefined): string | null {
    if (!header?.startsWith("Bearer ")) return null;
    const parts = header.slice(7).split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [
      string,
      string,
      string,
    ];
    const headerData = parseJsonPart<{ alg?: string; typ?: string }>(
      encodedHeader,
    );
    const claims = parseJsonPart<TokenClaims>(encodedPayload);
    if (headerData?.alg !== "HS256" || headerData.typ !== "JWT" || !claims)
      return null;
    const expected = createHmac("sha256", this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(encodedSignature, "base64url");
    } catch {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected) ||
      claims.iss !== issuer ||
      claims.aud !== audience ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      typeof claims.exp !== "number" ||
      claims.exp <= now
    )
      return null;
    return claims.sub;
  }

  private issue(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const encodedHeader = encode({ alg: "HS256", typ: "JWT" });
    const encodedPayload = encode({
      sub: userId,
      iss: issuer,
      aud: audience,
      iat: now,
      exp: now + 60 * 60 * 24,
    } satisfies TokenClaims);
    const signature = createHmac("sha256", this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
}
