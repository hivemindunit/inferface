import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { useStream } from "../hooks/useStream";
import {
  openAIStream,
  anthropicStream,
  mockSSEResponse,
  mockErrorResponse,
  slowOpenAIStream,
} from "./helpers";

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("useStream", () => {
  it("streams content correctly (happy path, OpenAI format)", async () => {
    const onFinish = vi.fn();
    const onStart = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "world", "!"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "openai",
        onFinish,
        onStart,
      })
    );

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.content).toBe("");

    await act(async () => {
      await result.current.start();
    });

    expect(onStart).toHaveBeenCalledOnce();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.content).toBe("Hello world!");
    expect(result.current.error).toBeNull();
    expect(onFinish).toHaveBeenCalledWith("Hello world!");
  });

  it("streams content with Anthropic format", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(anthropicStream(["Hello", " ", "world", "!"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "anthropic",
        onFinish,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("Hello world!");
    expect(onFinish).toHaveBeenCalledWith("Hello world!");
  });

  it("surfaces HTTP error as error state", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(500, "Internal Server Error")
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/error",
        onError,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Internal Server Error");
    expect(result.current.isStreaming).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("abort() stops the stream without error state", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(slowOpenAIStream(["Slow", " ", "response"], 200))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/slow",
        providerFormat: "openai",
        onError,
      })
    );

    // Start and then abort after a tick
    act(() => {
      result.current.start();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
      result.current.abort();
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it("reset() clears content and error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "world", "!"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("Hello world!");

    act(() => {
      result.current.reset();
    });

    expect(result.current.content).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.isStreaming).toBe(false);
  });

  it("supports api as a function returning a Response", async () => {
    const onFinish = vi.fn();
    const apiFn = vi.fn().mockResolvedValue(
      mockSSEResponse(openAIStream(["From", " ", "function"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: apiFn,
        providerFormat: "openai",
        onFinish,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(apiFn).toHaveBeenCalledOnce();
    expect(result.current.content).toBe("From function");
    expect(onFinish).toHaveBeenCalledWith("From function");
  });

  it("uses parseChunk when provided", async () => {
    const onChunk = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "world"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "openai",
        parseChunk: (chunk) => chunk.toUpperCase(),
        onChunk,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("HELLO WORLD");
    expect(onChunk).toHaveBeenCalledWith("HELLO");
  });

  it("parseChunk returning null skips the chunk", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["keep", "skip", "keep2"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "openai",
        parseChunk: (chunk) => (chunk.startsWith("skip") ? null : chunk),
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("keepkeep2");
  });

  it("reset clears error state after an error", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(500, "Server error")
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/error",
        onError,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBeInstanceOf(Error);

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.content).toBe("");
    expect(result.current.isStreaming).toBe(false);

    // Can start a new stream after reset
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["OK"]))
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("OK");
    expect(result.current.error).toBeNull();
  });

  it("falls back to HTTP status when error body cannot be parsed", async () => {
    const onError = vi.fn();

    // Return a non-JSON error response
    mockFetch.mockResolvedValueOnce(
      new Response("not json", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/error",
        onError,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error?.message).toBe("HTTP 502");
  });

  it("passes overrideBody to fetch", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useStream({
        api: "https://test.api/stream",
        providerFormat: "openai",
        body: { model: "base" },
      })
    );

    await act(async () => {
      await result.current.start({ temperature: 0.5 });
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.model).toBe("base");
    expect(body.temperature).toBe(0.5);
  });

  it("handles StrictMode double-invoke without duplicate requests", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValue(
      mockSSEResponse(openAIStream(["Hello", " ", "world", "!"]))
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);

    const { result } = renderHook(
      () =>
        useStream({
          api: "https://test.api/stream",
          providerFormat: "openai",
          onFinish,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.content).toBe("Hello world!");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
