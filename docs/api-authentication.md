# SellFuse API authentication

Browser and mobile clients authenticate to the SellFuse API; they never receive the Nader AI Gateway credential or the market-data service credential.

- `POST /v1/auth/register` accepts an email and 12+ character password.
- `POST /v1/auth/login` accepts the same credentials.
- Successful authentication returns a one-day HS256 access token with `iss=sellfuse`, `aud=sellfuse-api`, and the user ID in `sub`.
- All other `/v1` routes require `Authorization: Bearer <accessToken>`.
- Passwords are salted and hashed with scrypt. Token signatures and password hashes use constant-time comparisons.

The included user store is for local development and resets when the API restarts. Production must replace it with durable storage, revocation/session controls, email verification, account recovery, rate limiting, and secret rotation before public launch.
