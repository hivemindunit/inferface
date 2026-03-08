import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { StreamingText } from "../components/StreamingText";

// Mock shiki — it's async and not needed for these tests
vi.mock("shiki", () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn().mockReturnValue("<pre><code>mock</code></pre>"),
  }),
}));

describe("StreamingText", () => {
  it("renders plain text content", () => {
    render(<StreamingText content="Hello world" markdown={false} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders with cursor when isStreaming=true", () => {
    const { container } = render(
      <StreamingText content="Streaming..." isStreaming={true} />
    );
    const cursor = container.querySelector(".inferface-cursor");
    expect(cursor).toBeInTheDocument();
  });

  it("cursor disappears when streaming stops", async () => {
    const { container, rerender } = render(
      <StreamingText content="Streaming..." isStreaming={true} />
    );

    expect(container.querySelector(".inferface-cursor")).toBeInTheDocument();

    rerender(<StreamingText content="Done." isStreaming={false} />);

    // Cursor should be fading
    const fadingCursor = container.querySelector(".inferface-cursor--fading");
    expect(fadingCursor).toBeInTheDocument();

    // After 500ms the fading cursor should disappear
    await waitFor(
      () => {
        expect(container.querySelector(".inferface-cursor")).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("calls onStreamComplete when streaming transitions to done", () => {
    const onStreamComplete = vi.fn();

    const { rerender } = render(
      <StreamingText
        content="Partial..."
        isStreaming={true}
        onStreamComplete={onStreamComplete}
      />
    );

    expect(onStreamComplete).not.toHaveBeenCalled();

    rerender(
      <StreamingText
        content="Full content"
        isStreaming={false}
        onStreamComplete={onStreamComplete}
      />
    );

    expect(onStreamComplete).toHaveBeenCalledWith("Full content");
  });

  it("renders inline code with correct styling", () => {
    const { container } = render(
      <StreamingText content="Use `useState` hook" isStreaming={true} />
    );
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeInTheDocument();
    expect(codeEl?.textContent).toBe("useState");
    expect(codeEl?.className).toContain("font-mono");
  });

  it("passes className through to root", () => {
    const { container } = render(
      <StreamingText content="test" className="custom-class" />
    );
    const root = container.querySelector(".inferface-streaming-text");
    expect(root).toHaveClass("custom-class");
  });

  it("renders without cursor when showCursor=false", () => {
    const { container } = render(
      <StreamingText content="Streaming" isStreaming={true} showCursor={false} />
    );
    expect(container.querySelector(".inferface-cursor")).not.toBeInTheDocument();
  });

  it("has aria-live attribute for accessibility", () => {
    const { container } = render(<StreamingText content="test" />);
    const root = container.querySelector("[aria-live]");
    expect(root).toBeInTheDocument();
    expect(root?.getAttribute("aria-live")).toBe("polite");
  });
});
