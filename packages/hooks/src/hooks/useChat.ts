import { useRef, useState, useCallback, useEffect } from "react";
import type { Message, ProviderFormat } from "../types/core";
import { parseSSEStream } from "../utils/parseSSE";

/** Options for the useChat hook */
export interface UseChatOptions {
  /** API endpoint for chat completions */
  api: string;
  /** Initial messages to seed the conversation */
  initialMessages?: Message[];
  /** System prompt (prepended automatically as system message) */
  systemPrompt?: string;
  /** Additional body params passed with every request */
  body?: Record<string, unknown>;
  /** Headers to include */
  headers?: HeadersInit;
  /** Provider format for SSE parsing */
  providerFormat?: ProviderFormat;
  /** Called when assistant message is fully received */
  onFinish?: (message: Message) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Persist messages — provide a storage adapter */
  storage?: {
    load: () => Promise<Message[]> | Message[];
    save: (messages: Message[]) => Promise<void> | void;
  };
  /** Generate message IDs. Defaults to crypto.randomUUID() */
  generateId?: () => string;
}

/** Return value of the useChat hook */
export interface UseChatReturn {
  /** Full message history */
  messages: Message[];
  /** Send a user message and stream the assistant response */
  send: (content: string, attachments?: File[]) => Promise<void>;
  /** Abort the current stream */
  abort: () => void;
  /** True while streaming */
  isLoading: boolean;
  /** Current streaming content (before it's committed to messages[]) */
  streamingContent: string;
  /** Error state */
  error: Error | null;
  /** Regenerate the last assistant message */
  regenerate: () => Promise<void>;
  /** Clear all messages (and storage if configured) */
  clear: () => void;
  /** Append a message without triggering a request */
  appendMessage: (message: Omit<Message, "id">) => void;
  /** Update a specific message by ID */
  updateMessage: (id: string, updates: Partial<Message>) => void;
  /** Delete a specific message by ID */
  deleteMessage: (id: string) => void;
  /** Edit a user message and resend — truncates history after that message and re-streams */
  editAndResend: (id: string, newContent: string) => Promise<void>;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(
    options.initialMessages ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Track latest options to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const genId = useCallback(() => {
    return optionsRef.current.generateId?.() ?? crypto.randomUUID();
  }, []);

  // Storage hydration on mount
  useEffect(() => {
    const { storage } = optionsRef.current;
    if (!storage) return;
    let cancelled = false;
    const result = storage.load();
    if (result instanceof Promise) {
      result.then((loaded) => {
        if (!cancelled && loaded.length > 0) {
          setMessages(loaded);
        }
      });
    } else if (result.length > 0) {
      setMessages(result);
    }
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages on change
  const saveMessages = useCallback((msgs: Message[]) => {
    optionsRef.current.storage?.save(msgs);
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Core streaming request. Accepts the messages to send in the request body,
   * and the optimistic messages state (for rollback on error).
   * Returns the committed assistant Message on success, or throws.
   */
  const streamRequest = useCallback(
    async (
      requestMessages: Message[],
      preRequestMessages: Message[],
      currentMessages: Message[]
    ): Promise<void> => {
      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      streamingContentRef.current = "";
      setStreamingContent("");
      setError(null);
      setIsLoading(true);

      const opts = optionsRef.current;

      // Build the messages payload for the API
      const apiMessages: Array<{ role: string; content: string | import("../types/core").ContentPart[] }> = [];
      if (opts.systemPrompt) {
        apiMessages.push({ role: "system", content: opts.systemPrompt });
      }
      for (const msg of requestMessages) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }

      try {
        const response = await fetch(opts.api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...opts.headers,
          },
          body: JSON.stringify({
            ...opts.body,
            messages: apiMessages,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `HTTP ${response.status}`;
          try {
            const errBody = (await response.json()) as {
              error?: { message?: string };
            };
            message = errBody.error?.message ?? message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const contentType = response.headers.get("content-type") ?? "";
        const isSSE = contentType.includes("text/event-stream");

        if (isSSE) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Response body is not readable");

          const decoder = new TextDecoder();
          const format = opts.providerFormat ?? "openai";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const delta of parseSSEStream(chunk, format)) {
              streamingContentRef.current += delta;
              setStreamingContent(streamingContentRef.current);
            }
          }
        } else {
          // Non-streaming JSON response
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            content?: Array<{ text?: string }>;
          };
          const text =
            data.choices?.[0]?.message?.content ??
            data.content?.[0]?.text ??
            "";
          streamingContentRef.current = text;
          setStreamingContent(text);
        }

        // Commit the assistant message
        const assistantMessage: Message = {
          id: genId(),
          role: "assistant",
          content: streamingContentRef.current,
          createdAt: new Date(),
        };

        const finalMessages = [...currentMessages, assistantMessage];
        setMessages(finalMessages);
        saveMessages(finalMessages);
        setStreamingContent("");
        streamingContentRef.current = "";
        opts.onFinish?.(assistantMessage);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const finalError =
          err instanceof Error ? err : new Error(String(err));
        setError(finalError);
        // Roll back to pre-request state (remove optimistic user message)
        setMessages(preRequestMessages);
        opts.onError?.(finalError);
      } finally {
        setIsLoading(false);
      }
    },
    [genId, saveMessages]
  );

  const send = useCallback(
    async (content: string, _attachments?: File[]) => {
      const userMessage: Message = {
        id: genId(),
        role: "user",
        content,
        createdAt: new Date(),
      };

      // Optimistic append
      const preRequestMessages = messagesRef.current;
      const withUserMessage = [...preRequestMessages, userMessage];
      setMessages(withUserMessage);

      await streamRequest(withUserMessage, preRequestMessages, withUserMessage);
    },
    [genId, streamRequest]
  );

  const regenerate = useCallback(async () => {
    const msgs = messagesRef.current;
    if (msgs.length === 0) return;

    // Find the last assistant message and remove it
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    const withoutLastAssistant = msgs.slice(0, -1);
    setMessages(withoutLastAssistant);

    // The pre-request state for rollback is also without the assistant
    await streamRequest(
      withoutLastAssistant,
      withoutLastAssistant,
      withoutLastAssistant
    );
  }, [streamRequest]);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    streamingContentRef.current = "";
    setError(null);
    saveMessages([]);
  }, [saveMessages]);

  const appendMessage = useCallback(
    (msg: Omit<Message, "id">) => {
      setMessages((prev) => {
        const next = [...prev, { ...msg, id: genId() }];
        saveMessages(next);
        return next;
      });
    },
    [genId, saveMessages]
  );

  const updateMessage = useCallback(
    (id: string, updates: Partial<Message>) => {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        );
        saveMessages(next);
        return next;
      });
    },
    [saveMessages]
  );

  const deleteMessage = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== id);
        saveMessages(next);
        return next;
      });
    },
    [saveMessages]
  );

  const editAndResend = useCallback(
    async (id: string, newContent: string) => {
      const msgs = messagesRef.current;
      const idx = msgs.findIndex((m) => m.id === id);
      if (idx === -1) return;

      // Update the target message and truncate everything after it
      const updatedMessage: Message = {
        id: msgs[idx]!.id,
        role: msgs[idx]!.role,
        content: newContent,
        createdAt: new Date(),
      };
      const truncated = [...msgs.slice(0, idx), updatedMessage];
      setMessages(truncated);

      // Re-stream from this point — rollback target is before the edit
      const preRequestMessages = msgs.slice(0, idx);
      await streamRequest(truncated, preRequestMessages, truncated);
    },
    [streamRequest]
  );

  return {
    messages,
    send,
    abort,
    isLoading,
    streamingContent,
    error,
    regenerate,
    clear,
    appendMessage,
    updateMessage,
    deleteMessage,
    editAndResend,
  };
}
