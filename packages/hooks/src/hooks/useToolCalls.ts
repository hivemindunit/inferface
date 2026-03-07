import { useState, useCallback, useRef, useEffect } from "react";
import type { ToolCall, ToolResult, ProviderFormat } from "../types/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseToolCallsOptions {
  /**
   * Accumulated SSE content string to parse for tool calls.
   * Typically wired to `useStream().content` or `useChat().streamingContent`.
   * ReadableStream<string> variant is accepted but the string path is primary.
   */
  stream: ReadableStream<string> | string;

  /**
   * Auto-execute a tool call. Return the result.
   * If omitted, tool calls land in `pendingCalls` for manual resolution.
   */
  onToolCall?: (toolCall: ToolCall) => Promise<unknown> | unknown;

  /** Provider format — tool call JSON differs between OpenAI and Anthropic */
  providerFormat?: ProviderFormat;
}

export interface UseToolCallsReturn {
  /** All tool calls parsed so far (including completed ones) */
  toolCalls: ToolCall[];

  /** Tool calls awaiting resolution */
  pendingCalls: ToolCall[];

  /** Results keyed by toolCallId */
  results: Map<string, ToolResult>;

  /** True if any tool call is pending / executing */
  isExecuting: boolean;

  /** Manually provide a result for a tool call (human-in-the-loop) */
  resolveToolCall: (toolCallId: string, result: unknown) => void;

  /** Reject a tool call with an error */
  rejectToolCall: (toolCallId: string, error: Error) => void;
}

// ---------------------------------------------------------------------------
// OpenAI tool call parser
// ---------------------------------------------------------------------------
// OpenAI streams tool calls as JSON in the SSE `data:` payloads:
//   choices[0].delta.tool_calls[{index, id, type, function: {name, arguments}}]
// Arguments arrive as partial JSON strings accumulated per index.
// We detect them by scanning the accumulated content string for embedded JSON.
//
// However — the `stream` input here is the *text content* extracted by
// `useStream` / `parseSSE`, which strips the SSE framing and only yields
// `delta.content` text. Tool call deltas live in `delta.tool_calls`, NOT
// `delta.content`, so they never appear in the accumulated content string.
//
// The pragmatic approach for the string-input path: the caller passes the
// **raw SSE body** (or a pre-parsed tool-call JSON array) as the string.
// We parse embedded tool call JSON objects from it.
//
// For the demo / real usage, the API route will embed tool calls as a JSON
// block inside the text stream (a common pattern for mock endpoints).

interface RawToolCall {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * Parse tool calls from an accumulated string.
 * Supports two formats:
 * 1. A JSON array of tool call objects: [{"id":..., "function":{...}}, ...]
 * 2. Individual JSON objects with tool call shape embedded in text
 *
 * For the OpenAI format specifically, we look for a JSON block starting with
 * `[TOOL_CALLS]` marker followed by a JSON array, which is the convention
 * used by our mock API routes.
 */
function parseToolCallsFromString(content: string): ToolCall[] {
  const calls: ToolCall[] = [];

  // Pattern 1: [TOOL_CALLS] marker followed by JSON array
  const markerIdx = content.indexOf("[TOOL_CALLS]");
  if (markerIdx !== -1) {
    const afterMarker = content.slice(markerIdx + "[TOOL_CALLS]".length).trim();
    try {
      const parsed = JSON.parse(afterMarker) as RawToolCall[];
      if (Array.isArray(parsed)) {
        for (const raw of parsed) {
          if (raw.id && raw.function?.name) {
            calls.push({
              id: raw.id,
              type: "function",
              function: {
                name: raw.function.name,
                arguments: raw.function.arguments ?? "{}",
              },
            });
          }
        }
        return calls;
      }
    } catch {
      // Partial JSON — not ready yet, return empty
      return [];
    }
  }

  // Pattern 2: try to parse the entire string as a JSON array of tool calls
  const trimmed = content.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as RawToolCall[];
      if (Array.isArray(parsed)) {
        for (const raw of parsed) {
          if (raw.id && raw.function?.name) {
            calls.push({
              id: raw.id,
              type: "function",
              function: {
                name: raw.function.name,
                arguments: raw.function.arguments ?? "{}",
              },
            });
          }
        }
        return calls;
      }
    } catch {
      // not valid JSON yet
    }
  }

  return calls;
}

// ---------------------------------------------------------------------------
// Max auto-execution depth
// ---------------------------------------------------------------------------
const MAX_DEPTH = 5;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToolCalls(options: UseToolCallsOptions): UseToolCallsReturn {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, ToolResult>>(new Map());

  const depthRef = useRef(0);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Parse tool calls from the string input whenever it changes
  useEffect(() => {
    if (typeof options.stream !== "string") return;

    const parsed = parseToolCallsFromString(options.stream);
    if (parsed.length === 0) return;

    // Find new tool calls we haven't processed yet
    const newCalls = parsed.filter((tc) => !processedIdsRef.current.has(tc.id));
    if (newCalls.length === 0) return;

    // Mark as processed
    for (const tc of newCalls) {
      processedIdsRef.current.add(tc.id);
    }

    setToolCalls((prev) => [...prev, ...newCalls]);

    // If onToolCall is provided and we haven't hit the depth limit, auto-execute
    if (optionsRef.current.onToolCall && depthRef.current < MAX_DEPTH) {
      depthRef.current++;
      const newPendingIds = new Set(newCalls.map((tc) => tc.id));
      setPendingIds((prev) => new Set([...prev, ...newPendingIds]));

      for (const tc of newCalls) {
        Promise.resolve(optionsRef.current.onToolCall(tc))
          .then((result) => {
            setResults((prev) => {
              const next = new Map(prev);
              next.set(tc.id, { toolCallId: tc.id, result });
              return next;
            });
            setPendingIds((prev) => {
              const next = new Set(prev);
              next.delete(tc.id);
              return next;
            });
          })
          .catch((err) => {
            const error = err instanceof Error ? err : new Error(String(err));
            setResults((prev) => {
              const next = new Map(prev);
              next.set(tc.id, { toolCallId: tc.id, result: undefined, error });
              return next;
            });
            setPendingIds((prev) => {
              const next = new Set(prev);
              next.delete(tc.id);
              return next;
            });
          });
      }
    } else if (!optionsRef.current.onToolCall) {
      // No auto-execute — add to pending for manual resolution
      setPendingIds((prev) => new Set([...prev, ...newCalls.map((tc) => tc.id)]));
    }
  }, [options.stream]);

  const resolveToolCall = useCallback((toolCallId: string, result: unknown) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(toolCallId, { toolCallId, result });
      return next;
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(toolCallId);
      return next;
    });
  }, []);

  const rejectToolCall = useCallback((toolCallId: string, error: Error) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(toolCallId, { toolCallId, result: undefined, error });
      return next;
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(toolCallId);
      return next;
    });
  }, []);

  // Derive pendingCalls from toolCalls + pendingIds
  const pendingCalls = toolCalls.filter((tc) => pendingIds.has(tc.id));
  const isExecuting = pendingIds.size > 0;

  return {
    toolCalls,
    pendingCalls,
    results,
    isExecuting,
    resolveToolCall,
    rejectToolCall,
  };
}
