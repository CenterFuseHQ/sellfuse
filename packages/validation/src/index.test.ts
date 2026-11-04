import { describe, expect, it } from "vitest";
import { assertValidImages, type ImageInput } from "./index.js";

function jpeg(size: number): ImageInput {
  const bytes = Buffer.alloc(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  return { mimeType: "image/jpeg", base64: bytes.toString("base64") };
}

describe("image request resource bounds", () => {
  it("accepts images within per-image and aggregate limits", () => {
    expect(() => assertValidImages([jpeg(16), jpeg(16)], 16, 8, 32)).not.toThrow();
  });

  it("rejects aggregate image payloads over the configured limit", () => {
    expect(() => assertValidImages([jpeg(16), jpeg(17)], 32, 8, 32)).toThrow(
      "IMAGE_TOTAL_SIZE_LIMIT",
    );
  });
});
