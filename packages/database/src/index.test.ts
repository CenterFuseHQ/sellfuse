import { describe, expect, it } from "vitest";
import { validateMigrations } from "./index.js";
describe("database migrations", () => { it("are additive, ordered, and keep product ownership explicit", async () => { await expect(validateMigrations()).resolves.toEqual({ files: ["0001_centerfuse_foundation.sql"], schemas: ["buyfuse", "centerfuse", "sellfuse"] }); }); });
