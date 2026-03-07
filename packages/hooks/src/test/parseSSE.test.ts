import { describe, it, expect } from "vitest";
import {
  parseOpenAIChunk,
  parseAnthropicChunk,
  parseSSEStream,
} from "../utils/parseSSE";

// ---------------------------------------------------------------------------
// parseOpenAIChunk
// ---------------------------------------------------------------------------
describe("parseOpenAIChunk", () => {
  it("extracts content from a valid OpenAI chunk", () => {
    const raw = JSON.stringify({
      id: "chatcmpl-abc",
      choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }],
    });
    expect(parseOpenAIChunk(raw)).toBe("Hello");
  });

  it("returns null for [DONE] sentinel", () => {
    expect(parseOpenAIChunk("[DONE]")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseOpenAIChunk("{not json")).toBeNull();
  });

  it("returns null when delta has no content (empty delta)", () => {
    const raw = JSON.stringify({
      choices: [{ index: 0, delta: {}, finish_reason: null }],
    });
    expect(parseOpenAIChunk(raw)).toBeNull();
  });

  it("returns null when content is null", () => {
    const raw = JSON.stringify({
      choices: [{ index: 0, delta: { content: null }, finish_reason: null }],
    });
    expect(parseOpenAIChunk(raw)).toBeNull();
  });

  it("returns empty string when content is empty string", () => {
    const raw = JSON.stringify({
      choices: [{ index: 0, delta: { content: "" }, finish_reason: null }],
    });
    // Empty string is falsy but ?? null only matches null/undefined
    expect(parseOpenAIChunk(raw)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseAnthropicChunk
// ---------------------------------------------------------------------------
describe("parseAnthropicChunk", () => {
  it("extracts text from content_block_delta with text_delta", () => {
    const raw = JSON.stringify({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "World" },
    });
    expect(parseAnthropicChunk(raw, "content_block_delta")).toBe("World");
  });

  it("returns null for message_stop event", () => {
    const raw = JSON.stringify({ type: "message_stop" });
    expect(parseAnthropicChunk(raw, "message_stop")).toBeNull();
  });

  it("returns null for message_delta event", () => {
    const raw = JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
    });
    expect(parseAnthropicChunk(raw, "message_delta")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseAnthropicChunk("{broken", "content_block_delta")).toBeNull();
  });

  it("returns null for non-text_delta content_block_delta", () => {
    const raw = JSON.stringify({
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: '{"key":' },
    });
    expect(parseAnthropicChunk(raw, "content_block_delta")).toBeNull();
  });

  it("returns null for content_block_start", () => {
    const raw = JSON.stringify({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    });
    expect(parseAnthropicChunk(raw, "content_block_start")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseSSEStream
// ---------------------------------------------------------------------------
describe("parseSSEStream", () => {
  it("parses multi-line OpenAI SSE chunk", () => {
    const chunk = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hi" } }] })}`,
      "",
      `data: ${JSON.stringify({ choices: [{ delta: { content: " there" } }] })}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    const results = [...parseSSEStream(chunk, "openai")];
    expect(results).toEqual(["Hi", " there"]);
  });

  it("parses multi-line Anthropic SSE chunk", () => {
    const chunk = [
      "event: content_block_delta",
      `data: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello" },
      })}`,
      "",
      "event: content_block_delta",
      `data: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: " World" },
      })}`,
      "",
      "event: message_stop",
      `data: ${JSON.stringify({ type: "message_stop" })}`,
      "",
    ].join("\n");

    const results = [...parseSSEStream(chunk, "anthropic")];
    expect(results).toEqual(["Hello", " World"]);
  });

  it("skips empty data lines", () => {
    const chunk = ["data: ", "", "data: [DONE]", ""].join("\n");
    const results = [...parseSSEStream(chunk, "openai")];
    expect(results).toEqual([]);
  });

  it("handles chunk with only [DONE]", () => {
    const chunk = "data: [DONE]\n\n";
    const results = [...parseSSEStream(chunk, "openai")];
    expect(results).toEqual([]);
  });
});
