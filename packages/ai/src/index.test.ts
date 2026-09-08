import { describe, expect, it } from "vitest";
import { MockAiGateway } from "./index.js";
describe("CenterFuse AI boundary", () => { it("is provider-neutral and mockable without credentials", () => { expect(new MockAiGateway([])).toBeDefined(); }); });
