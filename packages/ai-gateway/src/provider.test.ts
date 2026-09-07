import { afterEach, describe, expect, it, vi } from "vitest";
import { GATEWAY_PROTOCOL_VERSION } from "./protocol.js";
import { OllamaProvider } from "./provider.js";

afterEach(() => vi.unstubAllGlobals());

describe("Ollama provider", () => {
  it("sends vision inference only to the configured local runtime", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ message: { content: '{"ok":true}' } }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OllamaProvider({
      baseUrl: "http://127.0.0.1:11434",
      textModel: "local-text",
      visionModel: "local-vision",
      embeddingModel: "local-embedding",
      timeoutMs: 1000,
    });
    const result = await provider.infer({
      version: GATEWAY_PROTOCOL_VERSION,
      tenantId: "sellfuse",
      traceId: "d25fa697-d32c-4a12-a0fe-e84739bc5855",
      modelRole: "VISION_MODEL",
      messages: [{ role: "user", content: "Identify this item" }],
      images: [{ mimeType: "image/jpeg", base64: "/9j/AAAAAAAAAAAA" }],
      responseSchema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
      },
      temperature: 0,
      maxTokens: 128,
    });
    expect(result.content).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "local-vision",
      stream: false,
    });
  });
});
