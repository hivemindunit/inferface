import { describe, it, expect } from "vitest";
import { extractText } from "../types/core";

describe("extractText", () => {
  it("returns the string directly for string content", () => {
    expect(extractText("Hello world")).toBe("Hello world");
  });

  it("concatenates text parts from ContentPart[]", () => {
    const content = [
      { type: "text" as const, text: "Hello " },
      { type: "image_url" as const, image_url: { url: "https://example.com/img.png" } },
      { type: "text" as const, text: "world" },
    ];
    expect(extractText(content)).toBe("Hello world");
  });

  it("returns empty string for ContentPart[] with no text parts", () => {
    const content = [
      { type: "image_url" as const, image_url: { url: "https://example.com/img.png" } },
    ];
    expect(extractText(content)).toBe("");
  });

  it("returns empty string for empty ContentPart[]", () => {
    expect(extractText([])).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(extractText("")).toBe("");
  });
});
