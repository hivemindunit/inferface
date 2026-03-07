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
