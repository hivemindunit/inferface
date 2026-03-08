import { useRef, useState, useCallback } from "react";
import type { ProviderFormat } from "../types/core";
import { parseSSEStream } from "../utils/parseSSE";

/** Options for the useCompletion hook */
export interface UseCompletionOptions {
  /** API endpoint */
  api: string;
  /** Initial prompt (optional — can pass at call time) */
  initialPrompt?: string;
  /** Additional body params */
  body?: Record<string, unknown>;
  /** Headers */
  headers?: HeadersInit;
  /** Provider format for SSE parsing */
  providerFormat?: ProviderFormat;
  /** Callback on completion */
  onFinish?: (completion: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/** Return value of the useCompletion hook */
export interface UseCompletionReturn {
  /** Full completion text (streaming or final) */
  completion: string;
  /** Trigger a completion */
  complete: (prompt: string, overrideBody?: Record<string, unknown>) => Promise<void>;
  /** Abort in-flight completion */
  abort: () => void;
  /** True while streaming/loading */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Reset completion to empty string */
  reset: () => void;
}

export function useCompletion(options: UseCompletionOptions): UseCompletionReturn {
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");

  // Track latest options to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    contentRef.current = "";
    setCompletion("");
    setError(null);
    setIsLoading(false);
  }, []);

  const complete = useCallback(
    async (prompt: string, overrideBody?: Record<string, unknown>) => {
      // Abort any in-flight request (concurrent call protection)
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      contentRef.current = "";
      setCompletion("");
      setError(null);
      setIsLoading(true);

      const opts = optionsRef.current;

      try {
        const response = await fetch(opts.api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...opts.headers,
          },
          body: JSON.stringify({
            ...opts.body,
            prompt,
            ...overrideBody,
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
          // Stream SSE response
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Response body is not readable");

          const decoder = new TextDecoder();
          const format = opts.providerFormat ?? "openai";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const delta of parseSSEStream(chunk, format)) {
              contentRef.current += delta;
              setCompletion(contentRef.current);
            }
          }
        } else {
          // Non-streaming JSON response — extract text
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            content?: Array<{ text?: string }>;
          };
          const text =
            data.choices?.[0]?.message?.content ??
            data.content?.[0]?.text ??
            "";
          contentRef.current = text;
          setCompletion(text);
        }

        opts.onFinish?.(contentRef.current);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const finalError = err instanceof Error ? err : new Error(String(err));
        setError(finalError);
        opts.onError?.(finalError);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { completion, complete, abort, isLoading, error, reset };
}
