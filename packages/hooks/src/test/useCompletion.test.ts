import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCompletion } from "../hooks/useCompletion";
import {
  openAIStream,
  mockSSEResponse,
  mockErrorResponse,
  mockJSONResponse,
  slowOpenAIStream,
} from "./helpers";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("useCompletion", () => {
  it("happy path: completes via SSE stream", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "world", "!"]))
    );

    const { result } = renderHook(() =>
      useCompletion({
        api: "https://test.api/stream",
        providerFormat: "openai",
        onFinish,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.completion).toBe("");

    await act(async () => {
      await result.current.complete("test prompt");
    });

    expect(result.current.completion).toBe("Hello world!");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onFinish).toHaveBeenCalledWith("Hello world!");
  });

  it("handles non-streaming JSON response", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValueOnce(mockJSONResponse("Hello from JSON!"));

    const { result } = renderHook(() =>
      useCompletion({
        api: "https://test.api/json",
        onFinish,
      })
    );

    await act(async () => {
      await result.current.complete("test prompt");
    });

    expect(result.current.completion).toBe("Hello from JSON!");
    expect(onFinish).toHaveBeenCalledWith("Hello from JSON!");
  });

  it("concurrent calls: second call aborts the first", async () => {
    const onFinish = vi.fn();

    // First call returns a slow stream
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(slowOpenAIStream(["Slow", " ", "response"], 500))
    );
    // Second call returns a fast stream
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Fast", "!"]))
    );

    const { result } = renderHook(() =>
      useCompletion({
        api: "https://test.api/stream",
        providerFormat: "openai",
        onFinish,
      })
    );

    // Start first call (slow)
    act(() => {
      result.current.complete("first");
    });

    // Start second call immediately — should abort first
    await act(async () => {
      await result.current.complete("second");
    });

    // Second call's content should be what we get
    expect(result.current.completion).toBe("Fast!");
    expect(result.current.isLoading).toBe(false);
  });

  it("reset() clears completion and error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "world", "!"]))
    );

    const { result } = renderHook(() =>
      useCompletion({
        api: "https://test.api/stream",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.complete("test");
    });

    expect(result.current.completion).toBe("Hello world!");

    act(() => {
      result.current.reset();
    });

    expect(result.current.completion).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces HTTP errors", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(500, "Internal Server Error")
    );

    const { result } = renderHook(() =>
      useCompletion({
        api: "https://test.api/error",
        onError,
      })
    );

    await act(async () => {
      await result.current.complete("test");
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Internal Server Error");
    expect(onError).toHaveBeenCalledOnce();
  });
});
