import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ChatThread } from "../components/ChatThread";
import type { ChatMessage } from "../components/ChatThread/types";

// Mock shiki (used by StreamingText internally)
vi.mock("shiki", () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn().mockReturnValue("<pre><code>mock</code></pre>"),
  }),
}));

const makeMessages = (): ChatMessage[] => [
  { id: "1", role: "user", content: "Hello" },
  { id: "2", role: "assistant", content: "Hi there! How can I help?" },
];

describe("ChatThread", () => {
  it("renders empty state when no messages", () => {
    render(<ChatThread messages={[]} />);
    expect(screen.getByText("Send a message to start chatting")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    render(<ChatThread messages={makeMessages()} />);
    // User message
    expect(screen.getByText("Hello")).toBeInTheDocument();
    // Assistant message rendered through StreamingText/markdown
    expect(screen.getByText(/Hi there/)).toBeInTheDocument();
  });

  it("renders streaming indicator when isLoading=true", () => {
    render(<ChatThread messages={[]} isLoading={true} />);
    expect(screen.getByRole("status", { name: /typing/i })).toBeInTheDocument();
  });

  it("copy button exists on assistant messages", () => {
    render(<ChatThread messages={makeMessages()} showCopyButton={true} />);
    const copyButtons = screen.getAllByLabelText("Copy message");
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it("has role=log for accessibility", () => {
    const { container } = render(<ChatThread messages={[]} />);
    expect(container.querySelector("[role='log']")).toBeInTheDocument();
  });

  it("renders streaming content bubble when provided", () => {
    render(
      <ChatThread
        messages={[{ id: "1", role: "user", content: "Hi" }]}
        streamingContent="Partial response..."
      />
    );
    expect(screen.getByText(/Partial response/)).toBeInTheDocument();
  });

  it("does not render system messages", () => {
    const msgs: ChatMessage[] = [
      { id: "1", role: "system", content: "System prompt" },
      { id: "2", role: "user", content: "Hello" },
    ];
    render(<ChatThread messages={msgs} />);
    expect(screen.queryByText("System prompt")).not.toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
