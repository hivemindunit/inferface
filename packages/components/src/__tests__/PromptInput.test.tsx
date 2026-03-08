import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { PromptInput } from "../components/PromptInput";

describe("PromptInput", () => {
  it("renders textarea with placeholder", () => {
    render(<PromptInput placeholder="Ask anything..." />);
    expect(screen.getByPlaceholderText("Ask anything...")).toBeInTheDocument();
  });

  it("renders with default placeholder", () => {
    render(<PromptInput />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("calls onSubmit with text on Enter", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} defaultValue="Hello" />);
    const textarea = screen.getByRole("textbox", { name: /message input/i });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith("Hello");
  });

  it("does NOT submit on Shift+Enter (newline instead)", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} defaultValue="Hello" />);
    const textarea = screen.getByRole("textbox", { name: /message input/i });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears textarea after submit (uncontrolled)", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} defaultValue="Hello" />);
    const textarea = screen.getByRole("textbox", { name: /message input/i }) as HTMLTextAreaElement;

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith("Hello");
    expect(textarea.value).toBe("");
  });

  it("submit button is disabled when isLoading=true", () => {
    render(<PromptInput isLoading={true} defaultValue="test" />);
    const sendButton = screen.getByLabelText("Sending...");
    expect(sendButton).toBeDisabled();
  });

  it("shows stop button when isLoading=true and onStop is provided", () => {
    const onStop = vi.fn();
    render(<PromptInput isLoading={true} onStop={onStop} defaultValue="test" />);
    const stopButton = screen.getByLabelText("Stop generating");
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("submit button is disabled when textarea is empty", () => {
    render(<PromptInput />);
    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).toBeDisabled();
  });

  it("does not submit empty/whitespace-only text", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} defaultValue="   " />);
    const textarea = screen.getByRole("textbox", { name: /message input/i });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<PromptInput onChange={onChange} />);
    const textarea = screen.getByRole("textbox", { name: /message input/i });

    fireEvent.change(textarea, { target: { value: "new text" } });

    expect(onChange).toHaveBeenCalledWith("new text");
  });

  it("supports controlled mode", () => {
    const onChange = vi.fn();
    render(<PromptInput value="controlled" onChange={onChange} />);
    const textarea = screen.getByRole("textbox", { name: /message input/i }) as HTMLTextAreaElement;
    expect(textarea.value).toBe("controlled");
  });
});
