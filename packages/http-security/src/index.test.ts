import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  FixedWindowRateLimiter,
  InvalidJsonBodyError,
  readJsonBody,
  RequestBodyTooLargeError,
} from "./index.js";

describe("bounded HTTP security helpers", () => {
  it("parses bounded JSON and distinguishes an empty body", async () => {
    expect(
      await readJsonBody(Readable.from([Buffer.from('{"ok":true}')]), 32),
    ).toEqual({ ok: true });
    expect(await readJsonBody(Readable.from([]), 32)).toBeUndefined();
  });

  it("rejects oversized and malformed bodies with fixed error codes", async () => {
    await expect(
      readJsonBody(Readable.from([Buffer.from("12345")]), 4),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    await expect(
      readJsonBody(Readable.from([Buffer.from("{")]), 4),
    ).rejects.toBeInstanceOf(InvalidJsonBodyError);
  });

  it("stops reading as soon as a streaming body exceeds its limit", async () => {
    let chunksRead = 0;
    async function* oversized(): AsyncGenerator<string> {
      chunksRead += 1;
      yield "12345";
      chunksRead += 1;
      yield "should-not-be-read";
    }

    await expect(readJsonBody(oversized(), 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(chunksRead).toBe(1);
  });

  it("expires fixed-window attempts without increasing denied counters", () => {
    let now = 100;
    const limiter = new FixedWindowRateLimiter(2, 1000, 2, () => now);
    expect(limiter.allow("user")).toBe(true);
    expect(limiter.allow("user")).toBe(true);
    expect(limiter.allow("user")).toBe(false);
    now = 1100;
    expect(limiter.allow("user")).toBe(true);
  });

  it("bounds distinct keys and removes expired keys before rejecting new clients", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1, 1000, 1, () => now);
    expect(limiter.allow("first")).toBe(true);
    expect(limiter.allow("second")).toBe(false);
    now = 1000;
    expect(limiter.allow("second")).toBe(true);
  });
});
