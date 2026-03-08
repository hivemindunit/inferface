import { useRef, useState, useCallback } from "react";
import type { ProviderFormat } from "../types/core";
import { parseSSEStream } from "../utils/parseSSE";

/** Options for the useStream hook */
export interface UseStreamOptions {
  /** Endpoint to POST to, or a function returning a Response directly */
  api: string | (() => Promise<Response>);
  /** Request body — serialized as JSON when api is a string */
  body?: Record<string, unknown>;
  /** Additional headers */
  headers?: HeadersInit;
  /** Provider format for SSE parsing. Defaults to 'openai' */
  providerFormat?: ProviderFormat;
  /** Custom SSE parser — override if providerFormat doesn't cover your case */
  parseChunk?: (chunk: string) => string | null;
  /** Called when the stream starts */
  onStart?: () => void;
  /** Called with each decoded text delta */
  onChunk?: (chunk: string) => void;
  /** Called with full accumulated content on completion */
  onFinish?: (content: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Flush mode for downstream processing */
  flushMode?: "immediate" | "raf";
}

/** Return value of the useStream hook */
export interface UseStreamReturn {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  abort: () => void;
  start: (overrideBody?: Record<string, unknown>) => Promise<void>;
  reset: () => void;
}

export function useStream(options: UseStreamOptions): UseStreamReturn {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    contentRef.current = "";
    setContent("");
    setError(null);
    setIsStreaming(false);
  }, []);

  const start = useCallback(
    async (overrideBody?: Record<string, unknown>) => {
      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      contentRef.current = "";
      setContent("");
      setError(null);
      setIsStreaming(true);
      options.onStart?.();

      try {
        let response: Response;
        if (typeof options.api === "function") {
          response = await options.api();
        } else {
          response = await fetch(options.api, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...options.headers,
            },
            body: JSON.stringify({ ...options.body, ...overrideBody }),
            signal: controller.signal,
          });
        }

        if (!response.ok) {
          let message = `HTTP ${response.status}`;
          try {
            const errBody = (await response.json()) as { error?: { message?: string } };
            message = errBody.error?.message ?? message;
          } catch {
            // ignore parse error
          }
          throw new Error(message);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        const decoder = new TextDecoder();
        const format = options.providerFormat ?? "openai";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const delta of parseSSEStream(chunk, format)) {
            if (options.parseChunk) {
              // custom parser takes priority
              const custom = options.parseChunk(delta);
              if (custom !== null) {
                contentRef.current += custom;
                setContent(contentRef.current);
                options.onChunk?.(custom);
              }
            } else {
              contentRef.current += delta;
              setContent(contentRef.current);
              options.onChunk?.(delta);
            }
          }
        }

        options.onFinish?.(contentRef.current);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User-triggered abort — silent
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
      } finally {
        setIsStreaming(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options]
  );

  return { content, isStreaming, error, abort, start, reset };
}
