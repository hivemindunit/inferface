import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useToolCalls } from "../hooks/useToolCalls";

describe("useToolCalls", () => {
  it("parses tool calls from [TOOL_CALLS] marker in string", () => {
    const toolCallsJson = JSON.stringify([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "search_flights",
          arguments: JSON.stringify({ origin: "YYZ", dest: "CDG", date: "2026-06-15" }),
        },
      },
    ]);

    const content = `Let me search for flights for you.\n[TOOL_CALLS]${toolCallsJson}`;

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    expect(result.current.toolCalls).toHaveLength(1);
    expect(result.current.toolCalls[0].id).toBe("call_1");
    expect(result.current.toolCalls[0].function.name).toBe("search_flights");
    expect(result.current.pendingCalls).toHaveLength(1);
    expect(result.current.isExecuting).toBe(true);
  });

  it("parses tool calls from raw JSON array string", () => {
    const content = JSON.stringify([
      {
        id: "call_2",
        type: "function",
        function: {
          name: "get_weather",
          arguments: JSON.stringify({ city: "Paris" }),
        },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    expect(result.current.toolCalls).toHaveLength(1);
    expect(result.current.toolCalls[0].function.name).toBe("get_weather");
  });

  it("resolveToolCall removes from pendingCalls and adds to results", async () => {
    const content = JSON.stringify([
      {
        id: "call_3",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Paris"}' },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    // Should be pending initially
    expect(result.current.pendingCalls).toHaveLength(1);
    expect(result.current.isExecuting).toBe(true);

    // Resolve it
    act(() => {
      result.current.resolveToolCall("call_3", { temp: 22, condition: "sunny" });
    });

    expect(result.current.pendingCalls).toHaveLength(0);
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.results.get("call_3")).toEqual({
      toolCallId: "call_3",
      result: { temp: 22, condition: "sunny" },
    });
  });

  it("rejectToolCall removes from pendingCalls and adds error to results", () => {
    const content = JSON.stringify([
      {
        id: "call_4",
        type: "function",
        function: { name: "search_flights", arguments: '{}' },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    expect(result.current.pendingCalls).toHaveLength(1);

    const err = new Error("User denied");
    act(() => {
      result.current.rejectToolCall("call_4", err);
    });

    expect(result.current.pendingCalls).toHaveLength(0);
    expect(result.current.isExecuting).toBe(false);

    const toolResult = result.current.results.get("call_4");
    expect(toolResult?.error).toBe(err);
    expect(toolResult?.result).toBeUndefined();
  });

  it("handles multiple tool calls simultaneously", () => {
    const content = JSON.stringify([
      {
        id: "call_a",
        type: "function",
        function: { name: "search_flights", arguments: '{"origin":"YYZ"}' },
      },
      {
        id: "call_b",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Paris"}' },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    expect(result.current.toolCalls).toHaveLength(2);
    expect(result.current.pendingCalls).toHaveLength(2);
    expect(result.current.isExecuting).toBe(true);

    // Resolve first
    act(() => {
      result.current.resolveToolCall("call_a", { flights: [] });
    });

    expect(result.current.pendingCalls).toHaveLength(1);
    expect(result.current.isExecuting).toBe(true);

    // Resolve second
    act(() => {
      result.current.resolveToolCall("call_b", { temp: 25 });
    });

    expect(result.current.pendingCalls).toHaveLength(0);
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.results.size).toBe(2);
  });

  it("auto-executes with onToolCall callback", async () => {
    const onToolCall = vi.fn().mockResolvedValue({ temp: 20 });

    const content = JSON.stringify([
      {
        id: "call_auto",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"London"}' },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({
        stream: content,
        providerFormat: "openai",
        onToolCall,
      })
    );

    expect(onToolCall).toHaveBeenCalledOnce();
    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "call_auto",
        function: expect.objectContaining({ name: "get_weather" }),
      })
    );

    // Wait for the async resolution
    await waitFor(() => {
      expect(result.current.isExecuting).toBe(false);
    });

    expect(result.current.results.get("call_auto")).toEqual({
      toolCallId: "call_auto",
      result: { temp: 20 },
    });
  });

  it("handles onToolCall rejection", async () => {
    const onToolCall = vi.fn().mockRejectedValue(new Error("API down"));

    const content = JSON.stringify([
      {
        id: "call_fail",
        type: "function",
        function: { name: "search_flights", arguments: '{}' },
      },
    ]);

    const { result } = renderHook(() =>
      useToolCalls({
        stream: content,
        providerFormat: "openai",
        onToolCall,
      })
    );

    await waitFor(() => {
      expect(result.current.isExecuting).toBe(false);
    });

    const toolResult = result.current.results.get("call_fail");
    expect(toolResult?.error?.message).toBe("API down");
  });

  it("returns empty state for content with no tool calls", () => {
    const { result } = renderHook(() =>
      useToolCalls({ stream: "Hello, how can I help?", providerFormat: "openai" })
    );

    expect(result.current.toolCalls).toHaveLength(0);
    expect(result.current.pendingCalls).toHaveLength(0);
    expect(result.current.isExecuting).toBe(false);
  });

  it("returns empty state for incomplete/partial JSON", () => {
    // Partial JSON that isn't parseable yet
    const content = '[{"id":"call_1","function":{"name":"test"';

    const { result } = renderHook(() =>
      useToolCalls({ stream: content, providerFormat: "openai" })
    );

    expect(result.current.toolCalls).toHaveLength(0);
  });

  it("does not duplicate tool calls on re-render with same content", () => {
    const content = JSON.stringify([
      {
        id: "call_dedup",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"NYC"}' },
      },
    ]);

    const { result, rerender } = renderHook(
      ({ stream }) => useToolCalls({ stream, providerFormat: "openai" }),
      { initialProps: { stream: content } }
    );

    expect(result.current.toolCalls).toHaveLength(1);

    // Re-render with same content
    rerender({ stream: content });

    expect(result.current.toolCalls).toHaveLength(1);
  });
});
