import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useGenerativeUI } from "../hooks/useGenerativeUI";
import type { GenerativeUIComponentProps, GenerativeUIRegistry } from "../hooks/useGenerativeUI";
import type { ToolCall } from "../types/core";

// ---------------------------------------------------------------------------
// Mock component
// ---------------------------------------------------------------------------
function MockPicker(props: GenerativeUIComponentProps<{ label: string; options: string[] }>) {
  return React.createElement("div", { "data-testid": "mock-picker" },
    React.createElement("span", null, props.props.label),
    React.createElement("button", { onClick: () => props.onSubmit({ selected: "luxury" }) }, "Pick"),
  );
}

const registry: GenerativeUIRegistry = {
  "material-picker": MockPicker as React.ComponentType<GenerativeUIComponentProps<unknown>>,
};

describe("useGenerativeUI", () => {
  it("renders the correct component for a registered tool call", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    const toolCall: ToolCall = {
      id: "tc_1",
      type: "function",
      function: {
        name: "material-picker",
        arguments: JSON.stringify({ label: "Choose flooring", options: ["oak", "maple"] }),
      },
    };

    const node = result.current.renderToolCall(toolCall);
    expect(node).not.toBeNull();
  });

  it("returns null for an unregistered tool call name", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    const toolCall: ToolCall = {
      id: "tc_2",
      type: "function",
      function: {
        name: "unknown-component",
        arguments: "{}",
      },
    };

    const node = result.current.renderToolCall(toolCall);
    expect(node).toBeNull();
  });

  it("returns null for invalid JSON arguments", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    const toolCall: ToolCall = {
      id: "tc_3",
      type: "function",
      function: {
        name: "material-picker",
        arguments: "{ broken json",
      },
    };

    const node = result.current.renderToolCall(toolCall);
    expect(node).toBeNull();
  });

  it("isRegistered returns true for registered names", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    expect(result.current.isRegistered("material-picker")).toBe(true);
    expect(result.current.isRegistered("budget-slider")).toBe(false);
  });

  it("calls onResult with toolCallId when component submits", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    const toolCall: ToolCall = {
      id: "tc_submit",
      type: "function",
      function: {
        name: "material-picker",
        arguments: JSON.stringify({ label: "Flooring", options: [] }),
      },
    };

    const node = result.current.renderToolCall(toolCall);
    // The rendered element is a React element; we can verify props
    expect(node).not.toBeNull();
    // Verify the element is a MockPicker (React.createElement returns ReactElement)
    const el = node as React.ReactElement;
    expect(el.type).toBe(MockPicker);
    // Simulate the onSubmit call that the component would make
    el.props.onSubmit({ selected: "luxury" });
    expect(onResult).toHaveBeenCalledWith("tc_submit", { selected: "luxury" });
  });

  it("parses arguments correctly and passes as props", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry, onResult })
    );

    const args = { label: "Pick material", options: ["wood", "tile", "carpet"] };
    const toolCall: ToolCall = {
      id: "tc_args",
      type: "function",
      function: {
        name: "material-picker",
        arguments: JSON.stringify(args),
      },
    };

    const node = result.current.renderToolCall(toolCall);
    const el = node as React.ReactElement;
    expect(el.props.props).toEqual(args);
  });

  it("handles empty registry gracefully", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useGenerativeUI({ registry: {}, onResult })
    );

    const toolCall: ToolCall = {
      id: "tc_empty",
      type: "function",
      function: { name: "anything", arguments: "{}" },
    };

    expect(result.current.renderToolCall(toolCall)).toBeNull();
    expect(result.current.isRegistered("anything")).toBe(false);
  });
});
