import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.js";

describe("API authentication", () => {
  it("registers, logs in, and verifies a signed user token", async () => {
    const auth = new AuthService("test-secret-that-is-at-least-32-characters");
    const registered = await auth.register({
      email: "Seller@Example.com",
      password: "correct horse battery staple",
    });
    const userId = auth.authenticate(`Bearer ${registered.accessToken}`);
    expect(userId).toMatch(/[0-9a-f-]{36}/);

    const loggedIn = await auth.login({
      email: "seller@example.com",
      password: "correct horse battery staple",
    });
    expect(auth.authenticate(`Bearer ${loggedIn.accessToken}`)).toBe(userId);
  });

  it("rejects tampered tokens and invalid credentials", async () => {
    const auth = new AuthService("test-secret-that-is-at-least-32-characters");
    const registered = await auth.register({
      email: "seller@example.com",
      password: "correct horse battery staple",
    });
    expect(
      auth.authenticate(`Bearer ${registered.accessToken.slice(0, -2)}aa`),
    ).toBeNull();
    await expect(
      auth.login({
        email: "seller@example.com",
        password: "this password is wrong",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });
});
