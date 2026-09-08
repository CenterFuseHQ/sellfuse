import {
  InMemoryIdentityService,
  sellFuseEntitlement,
} from "@centerfuse/auth";

/**
 * Compatibility facade for the existing SellFuse API. Identity primitives are
 * owned by CenterFuse, while the legacy issuer and audience remain unchanged so
 * existing SellFuse sessions continue to validate during the migration.
 */
export class AuthService extends InMemoryIdentityService {
  constructor(secret: string) {
    super({
      secret,
      issuer: "sellfuse",
      audience: "sellfuse-api",
      defaultEntitlements: [sellFuseEntitlement],
    });
  }
}
