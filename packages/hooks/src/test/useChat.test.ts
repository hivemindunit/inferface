import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "../hooks/useChat";
import {
  openAIStream,
  mockSSEResponse,
  mockErrorResponse,
  slowOpenAIStream,
} from "./helpers";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  // Mock crypto.randomUUID for deterministic IDs
  let idCounter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `test-id-${++idCounter}`,
  });
});

describe("useChat", () => {
  it("happy path: send a message, streaming content updates, message committed on finish", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello", " ", "there", "!"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        onFinish,
      })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.send("Hi");
    });

    // User message + assistant message should be in history
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("Hi");
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("Hello there!");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.streamingContent).toBe("");
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish.mock.calls[0][0].content).toBe("Hello there!");
  });

  it("sends systemPrompt as system message in the API payload", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        systemPrompt: "You are helpful.",
      })
    );

    await act(async () => {
      await result.current.send("Hello");
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are helpful.",
    });
    expect(body.messages[1]).toEqual({ role: "user", content: "Hello" });
  });

  it("optimistic rollback: if request fails, user message removed", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      mockErrorResponse(500, "Server exploded")
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        onError,
      })
    );

    await act(async () => {
      await result.current.send("Hello");
    });

    // User message should be rolled back
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Server exploded");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("regenerate(): removes last assistant message and re-requests", async () => {
    // First response
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["First", " ", "response"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Hello");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe("First response");

    // Second response for regenerate
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Second", " ", "response"]))
    );

    await act(async () => {
      await result.current.regenerate();
    });

    // Should still have 2 messages: user + new assistant
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("Second response");
  });

  it("clear(): empties messages array", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.streamingContent).toBe("");
    expect(result.current.error).toBeNull();
  });

  it("appendMessage() adds a message without triggering a request", () => {
    const { result } = renderHook(() =>
      useChat({ api: "https://test.api/chat" })
    );

    act(() => {
      result.current.appendMessage({
        role: "assistant",
        content: "Injected message",
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("assistant");
    expect(result.current.messages[0].content).toBe("Injected message");
    expect(result.current.messages[0].id).toBeDefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("updateMessage() updates a message by ID", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Hi");
    });

    const userId = result.current.messages[0].id;

    act(() => {
      result.current.updateMessage(userId, { content: "Updated content" });
    });

    expect(result.current.messages[0].content).toBe("Updated content");
  });

  it("deleteMessage() removes a message by ID", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hello"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.messages).toHaveLength(2);
    const assistantId = result.current.messages[1].id;

    act(() => {
      result.current.deleteMessage(assistantId);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("user");
  });

  it("storage hydration: loads messages on mount", async () => {
    const storedMessages = [
      { id: "stored-1", role: "user" as const, content: "Previous question" },
      { id: "stored-2", role: "assistant" as const, content: "Previous answer" },
    ];

    const storage = {
      load: vi.fn().mockResolvedValue(storedMessages),
      save: vi.fn(),
    };

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        storage,
      })
    );

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0].content).toBe("Previous question");
    expect(result.current.messages[1].content).toBe("Previous answer");
    expect(storage.load).toHaveBeenCalledOnce();
  });

  it("storage hydration: sync load works", () => {
    const storedMessages = [
      { id: "s-1", role: "user" as const, content: "Sync question" },
    ];

    const storage = {
      load: vi.fn().mockReturnValue(storedMessages),
      save: vi.fn(),
    };

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        storage,
      })
    );

    // Sync load is applied in the effect, so should be there after render
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Sync question");
  });

  it("concurrent send: second send() aborts first", async () => {
    const onFinish = vi.fn();

    // First call — slow stream
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(slowOpenAIStream(["Slow", " ", "response"], 500))
    );
    // Second call — fast stream
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Fast", "!"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        onFinish,
      })
    );

    // Start first send
    act(() => {
      result.current.send("first");
    });

    // Start second send immediately — should abort first
    await act(async () => {
      await result.current.send("second");
    });

    // Should have second user message + "Fast!" assistant response
    // (first user message was rolled back by the abort, then second took over)
    const assistantMessages = result.current.messages.filter(
      (m) => m.role === "assistant"
    );
    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0].content).toBe("Fast!");
  });

  it("passes body params in every request", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        body: { model: "gpt-4o", temperature: 0.5 },
      })
    );

    await act(async () => {
      await result.current.send("Test");
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.model).toBe("gpt-4o");
    expect(body.temperature).toBe(0.5);
  });

  it("uses custom generateId function", async () => {
    let counter = 0;
    const generateId = () => `custom-${++counter}`;

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hi"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        generateId,
      })
    );

    await act(async () => {
      await result.current.send("Hello");
    });

    expect(result.current.messages[0].id).toBe("custom-1");
    expect(result.current.messages[1].id).toBe("custom-2");
  });

  it("initialMessages seeds the conversation", () => {
    const initial = [
      { id: "init-1", role: "user" as const, content: "Pre-loaded" },
    ];

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        initialMessages: initial,
      })
    );

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Pre-loaded");
  });
});
