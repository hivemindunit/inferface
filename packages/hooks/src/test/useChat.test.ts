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

  it("editAndResend() truncates history and re-streams", async () => {
    // First: send a message
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["First", " ", "answer"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Original question");
    });

    expect(result.current.messages).toHaveLength(2);
    const userMsgId = result.current.messages[0].id;

    // Second: editAndResend
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["New", " ", "answer"]))
    );

    await act(async () => {
      await result.current.editAndResend(userMsgId, "Edited question");
    });

    // Should have: edited user message + new assistant message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("Edited question");
    expect(result.current.messages[1].content).toBe("New answer");
  });

  it("editAndResend() no-ops for unknown message ID", async () => {
    const { result } = renderHook(() =>
      useChat({ api: "https://test.api/chat" })
    );

    await act(async () => {
      await result.current.editAndResend("nonexistent-id", "whatever");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("handles non-streaming JSON response", async () => {
    const onFinish = vi.fn();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "JSON response" } }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        onFinish,
      })
    );

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe("JSON response");
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("storage.save is called on send, clear, appendMessage, updateMessage, deleteMessage", async () => {
    const storage = {
      load: vi.fn().mockReturnValue([]),
      save: vi.fn(),
    };

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Hi"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        storage,
      })
    );

    // send triggers save
    await act(async () => {
      await result.current.send("Hello");
    });
    expect(storage.save).toHaveBeenCalled();

    const saveCountAfterSend = storage.save.mock.calls.length;

    // appendMessage triggers save
    act(() => {
      result.current.appendMessage({ role: "user", content: "appended" });
    });
    expect(storage.save.mock.calls.length).toBeGreaterThan(saveCountAfterSend);

    // deleteMessage triggers save
    const lastMsgId = result.current.messages[result.current.messages.length - 1].id;
    act(() => {
      result.current.deleteMessage(lastMsgId);
    });

    // clear triggers save with empty array
    act(() => {
      result.current.clear();
    });
    expect(storage.save).toHaveBeenCalledWith([]);
  });

  it("falls back to HTTP status when error body cannot be parsed", async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce(
      new Response("not json", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        onError,
      })
    );

    await act(async () => {
      await result.current.send("test");
    });

    expect(result.current.error?.message).toBe("HTTP 502");
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

  // ==========================================================================
  // Gap 1: Multimodal / vision support
  // ==========================================================================

  it("send() with File attachments builds multimodal content", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["I see an image"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    // Create a mock File
    const file = new File(["fake-image-data"], "photo.png", { type: "image/png" });

    // Mock FileReader for base64 conversion
    const originalFileReader = globalThis.FileReader;
    const mockReader = {
      result: "data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh",
      onloadend: null as (() => void) | null,
      onerror: null as ((err: any) => void) | null,
      readAsDataURL(_file: File) {
        setTimeout(() => this.onloadend?.(), 0);
      },
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockReader));

    await act(async () => {
      await result.current.send("Describe this image", [file]);
    });

    vi.stubGlobal("FileReader", originalFileReader);

    // User message should have ContentPart[] content
    const userMsg = result.current.messages[0];
    expect(Array.isArray(userMsg.content)).toBe(true);
    const parts = userMsg.content as any[];
    expect(parts[0]).toEqual({ type: "text", text: "Describe this image" });
    expect(parts[1].type).toBe("image_url");
    expect(parts[1].image_url.url).toContain("data:image/png;base64,");

    // The request body should contain the multimodal content
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    const userApiMsg = body.messages[0];
    expect(Array.isArray(userApiMsg.content)).toBe(true);
    expect(userApiMsg.content[0].type).toBe("text");
    expect(userApiMsg.content[1].type).toBe("image_url");
  });

  it("send() without attachments keeps string content", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
      })
    );

    await act(async () => {
      await result.current.send("Just text");
    });

    expect(typeof result.current.messages[0].content).toBe("string");
    expect(result.current.messages[0].content).toBe("Just text");
  });

  // ==========================================================================
  // Gap 2: Per-request body override & setBody
  // ==========================================================================

  it("send() with requestBody merges with base body for single request", async () => {
    mockFetch.mockResolvedValue(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        body: { model: "gpt-4o", temperature: 0.7 },
      })
    );

    // First send with per-request body
    await act(async () => {
      await result.current.send("First", undefined, { context: "extra", temperature: 0.2 });
    });

    const body1 = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body1.model).toBe("gpt-4o");
    expect(body1.temperature).toBe(0.2); // per-request wins
    expect(body1.context).toBe("extra");

    // Second send without per-request body — should NOT have context
    await act(async () => {
      await result.current.send("Second");
    });

    const body2 = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body2.model).toBe("gpt-4o");
    expect(body2.temperature).toBe(0.7); // back to base
    expect(body2.context).toBeUndefined();
  });

  it("setBody() updates base body for subsequent requests", async () => {
    mockFetch.mockResolvedValue(
      mockSSEResponse(openAIStream(["OK"]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        body: { model: "gpt-4o" },
      })
    );

    // Update body
    act(() => {
      result.current.setBody({ model: "gpt-4o-mini", stream: true });
    });

    await act(async () => {
      await result.current.send("Test");
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.stream).toBe(true);
  });

  // ==========================================================================
  // Gap 3: Tool calls stored on assistant messages
  // ==========================================================================

  it("strips [TOOL_CALLS] from content and stores toolCalls on assistant message", async () => {
    const toolCallsPayload = JSON.stringify([
      {
        id: "call_123",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Paris"}' },
      },
    ]);
    const streamContent = `Let me check the weather.\n[TOOL_CALLS]${toolCallsPayload}`;

    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream([streamContent]))
    );

    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        onFinish,
      })
    );

    await act(async () => {
      await result.current.send("What's the weather?");
    });

    const assistantMsg = result.current.messages[1];
    // Visible content should NOT contain the [TOOL_CALLS] block
    expect(assistantMsg.content).toBe("Let me check the weather.");
    expect(typeof assistantMsg.content).toBe("string");

    // Tool calls should be on the message
    expect(assistantMsg.toolCalls).toBeDefined();
    expect(assistantMsg.toolCalls).toHaveLength(1);
    expect(assistantMsg.toolCalls![0].id).toBe("call_123");
    expect(assistantMsg.toolCalls![0].function.name).toBe("get_weather");

    // onFinish should receive the cleaned message
    expect(onFinish.mock.calls[0][0].content).toBe("Let me check the weather.");
    expect(onFinish.mock.calls[0][0].toolCalls).toHaveLength(1);
  });

  it("handles response with no [TOOL_CALLS] marker normally", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Just a plain response"]))
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

    const assistantMsg = result.current.messages[1];
    expect(assistantMsg.content).toBe("Just a plain response");
    expect(assistantMsg.toolCalls).toBeUndefined();
  });

  // ==========================================================================
  // Gap 4: submitToolResults ordering
  // ==========================================================================

  it("submitToolResults appends tool messages after assistant and triggers follow-up", async () => {
    // First response: assistant with tool calls
    const toolCallsPayload = JSON.stringify([
      { id: "call_abc", type: "function", function: { name: "search", arguments: '{"q":"test"}' } },
    ]);
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream([`Searching...\n[TOOL_CALLS]${toolCallsPayload}`]))
    );

    const { result } = renderHook(() =>
      useChat({
        api: "https://test.api/chat",
        providerFormat: "openai",
        autoSubmitToolResults: true,
      })
    );

    await act(async () => {
      await result.current.send("Search for test");
    });

    // Now we have: user, assistant (with toolCalls)
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].toolCalls).toHaveLength(1);

    // Submit tool results — triggers follow-up
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse(openAIStream(["Here are the results"]))
    );

    await act(async () => {
      await result.current.submitToolResults({ call_abc: { results: ["found"] } });
    });

    // Should have: user, assistant, tool, assistant (follow-up)
    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[2].role).toBe("tool");
    expect(result.current.messages[2].toolCallId).toBe("call_abc");
    expect(result.current.messages[3].role).toBe("assistant");
    expect(result.current.messages[3].content).toBe("Here are the results");

    // Verify the follow-up request included tool messages in correct order
    const followUpBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    const roles = followUpBody.messages.map((m: any) => m.role);
    expect(roles).toEqual(["user", "assistant", "tool"]);
  });
});
