"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractText, useGenerativeUI } from "@inferface/hooks";
import type { GenerativeUIRegistry } from "@inferface/hooks";
import { cn } from "../../lib/utils";
import { StreamingText } from "../StreamingText";
import type { ChatMessage, ChatThreadProps, ChatThreadSlots } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTextContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  return extractText(content);
}

const AVATAR_COLORS: Record<string, string> = {
  user: "bg-emerald-600 text-white",
  assistant: "bg-muted text-muted-foreground",
  system: "bg-amber-700 text-white",
  tool: "bg-blue-700 text-white",
};

function DefaultAvatar({
  role,
  className,
}: {
  role: ChatMessage["role"];
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none",
        (AVATAR_COLORS[role] as string | undefined) ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {role.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG — no emoji, per project convention)
// ---------------------------------------------------------------------------

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3.5 8 6.5 11 12.5 5" />
    </svg>
  );
}

function RegenerateIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 8a6.5 6.5 0 0 1 11.48-4.17" />
      <path d="M14.5 8a6.5 6.5 0 0 1-11.48 4.17" />
      <polyline points="13 2 13 5 10 5" />
      <polyline points="3 14 3 11 6 11" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-3 .8.8-3 8.7-8.5z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Loading dots
// ---------------------------------------------------------------------------

function LoadingDots() {
  return (
    <span className="inline-flex gap-1" role="status" aria-label="Assistant is typing">
      <span className="animate-bounce text-muted-foreground" style={{ animationDelay: "0ms" }}>
        ·
      </span>
      <span className="animate-bounce text-muted-foreground" style={{ animationDelay: "150ms" }}>
        ·
      </span>
      <span className="animate-bounce text-muted-foreground" style={{ animationDelay: "300ms" }}>
        ·
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChatThread
// ---------------------------------------------------------------------------

export function ChatThread({
  messages: messagesProp,
  onRegenerate,
  isLoading: isLoadingProp,
  streamingContent: streamingContentProp,
  chat,
  className,
  classNames,
  autoScroll = true,
  showCopyButton = true,
  showRegenerateButton = true,
  renderMarkdown = true,
  slots,
  componentRegistry,
  onGenerativeUIResult,
}: ChatThreadProps) {
  // Derive state: prefer `chat` prop if provided, fall back to controlled props
  const messages = (chat?.messages ?? messagesProp ?? []) as ChatMessage[];
  const isLoading = chat?.isLoading ?? isLoadingProp ?? false;
  const streamingContent = chat?.streamingContent ?? streamingContentProp ?? "";
  const handleRegenerate = chat?.regenerate
    ? () => chat.regenerate()
    : onRegenerate;
  const editAndResend = chat?.editAndResend;

  // Generative UI
  const noopOnResult = useCallback((_id: string, _result: unknown) => {}, []);
  const { renderToolCall, isRegistered: isGenUIRegistered } = useGenerativeUI({
    registry: componentRegistry ?? {},
    onResult: onGenerativeUIResult ?? noopOnResult,
  });

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const SCROLL_THRESHOLD = 60;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledUp.current =
      el.scrollTop + el.clientHeight < el.scrollHeight - SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    if (!autoScroll || userScrolledUp.current) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent, autoScroll]);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (msg: ChatMessage) => {
    const text = getTextContent(msg.content);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId((cur) => (cur === msg.id ? null : cur)), 2000);
    } catch {
      // Clipboard API may fail in non-secure contexts — silently ignore
    }
  }, []);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const startEdit = useCallback((msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditingContent(getTextContent(msg.content));
  }, []);

  const submitEdit = useCallback(() => {
    if (!editingId || !editingContent.trim() || !editAndResend) return;
    editAndResend(editingId, editingContent.trim());
    setEditingId(null);
  }, [editingId, editingContent, editAndResend]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Find last assistant message id for regenerate button
  const lastAssistantId =
    showRegenerateButton && handleRegenerate
      ? [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null
      : null;

  // Empty state
  const isEmpty = messages.length === 0 && !streamingContent && !isLoading;

  return (
    <div
      role="log"
      aria-live="polite"
      className={cn("flex flex-col overflow-hidden", classNames?.root, className)}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn("flex-1 overflow-y-auto p-4 space-y-4", classNames?.messageList)}
      >
        {/* Empty state */}
        {isEmpty &&
          (slots?.emptyState ?? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <svg
                  className="mx-auto h-8 w-8 text-muted-foreground/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
                </svg>
                <p>Send a message to start chatting</p>
              </div>
            </div>
          ))}

        {/* Messages */}
        {messages.map((msg, idx) => {
          if (msg.role === "system") return null;

          // Allow full slot override
          if (slots?.messageBubble) {
            return (
              <div key={msg.id} role="article" aria-label={`${msg.role} message`}>
                {slots.messageBubble(msg, idx)}
              </div>
            );
          }

          const isUser = msg.role === "user";
          const isAssistant = msg.role === "assistant";
          const isEditing = editingId === msg.id;

          return (
            <div
              key={msg.id}
              role="article"
              aria-label={`${msg.role} message`}
              className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              {slots?.avatar ? (
                <div className={classNames?.avatar}>{slots.avatar(msg.role)}</div>
              ) : (
                <DefaultAvatar role={msg.role} className={classNames?.avatar} />
              )}

              <div className={cn("flex flex-col max-w-[80%] min-w-0", isUser ? "items-end" : "items-start")}>
                {/* Bubble */}
                {isEditing && editAndResend ? (
                  <div className="space-y-2 w-full">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitEdit();
                        }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      rows={3}
                      className="w-full min-w-[240px] rounded-xl border border-emerald-500/50 bg-muted px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitEdit}
                        disabled={!editingContent.trim()}
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40"
                      >
                        Save &amp; Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isUser
                        ? cn("bg-emerald-600 text-white", classNames?.userBubble)
                        : cn("bg-muted text-foreground", classNames?.assistantBubble),
                      classNames?.messageBubble
                    )}
                  >
                    {isAssistant || msg.role === "tool" ? (
                      <StreamingText
                        content={getTextContent(msg.content)}
                        isStreaming={false}
                        markdown={renderMarkdown}
                      />
                    ) : (
                      <>
                        {/* Render image_url content parts as thumbnails */}
                        {Array.isArray(msg.content) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.content
                              .filter((p): p is { type: "image_url"; image_url: { url: string; alt?: string } } => p.type === "image_url")
                              .map((p, i) => (
                                <img
                                  key={i}
                                  src={p.image_url.url}
                                  alt={p.image_url.alt ?? "Attached image"}
                                  className="max-h-40 rounded-lg object-cover"
                                />
                              ))}
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap font-sans">
                          {getTextContent(msg.content)}
                        </pre>
                      </>
                    )}
                  </div>
                )}

                {/* Generative UI tool calls */}
                {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && componentRegistry && (
                  <div className="mt-2 space-y-2 w-full">
                    {msg.toolCalls.map((tc) => {
                      const genNode = renderToolCall(tc);
                      if (genNode) {
                        return (
                          <div key={tc.id} className="rounded-xl border border-border bg-card/50 p-3">
                            {genNode}
                          </div>
                        );
                      }
                      // Fallback: approve/reject UI for unregistered tool calls
                      return (
                        <div
                          key={tc.id}
                          className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                Tool: {tc.function.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                                {tc.function.arguments}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => onGenerativeUIResult?.(tc.id, { approved: true })}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onGenerativeUIResult?.(tc.id, { approved: false })}
                                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Actions row */}
                {!isEditing && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      classNames?.actions
                    )}
                  >
                    {/* Edit button (user messages) */}
                    {isUser && editAndResend && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
                        aria-label="Edit message"
                      >
                        <PencilIcon />
                      </button>
                    )}

                    {/* Copy button (assistant messages) */}
                    {isAssistant && showCopyButton && (
                      <button
                        onClick={() => handleCopy(msg)}
                        className="p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
                        aria-label={copiedId === msg.id ? "Copied!" : "Copy message"}
                      >
                        {copiedId === msg.id ? (
                          <CheckIcon className="text-emerald-400" />
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                    )}

                    {/* Regenerate button (last assistant message only) */}
                    {isAssistant && msg.id === lastAssistantId && handleRegenerate && (
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        className="p-1 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
                        aria-label="Regenerate response"
                      >
                        <RegenerateIcon />
                      </button>
                    )}

                    {/* Slot: custom actions */}
                    {isAssistant && slots?.messageActions?.(msg)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming bubble */}
        {streamingContent && (
          <div role="article" aria-label="assistant message" className="group flex gap-3">
            {slots?.avatar ? (
              <div className={classNames?.avatar}>{slots.avatar("assistant")}</div>
            ) : (
              <DefaultAvatar role="assistant" className={classNames?.avatar} />
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-muted text-foreground",
                classNames?.assistantBubble,
                classNames?.messageBubble
              )}
            >
              <StreamingText
                content={streamingContent}
                isStreaming={true}
                markdown={renderMarkdown}
              />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          slots?.loadingIndicator ?? (
            <div className="flex gap-3">
              {slots?.avatar ? (
                <div className={classNames?.avatar}>{slots.avatar("assistant")}</div>
              ) : (
                <DefaultAvatar role="assistant" className={classNames?.avatar} />
              )}
              <div className="rounded-2xl px-4 py-2.5 bg-muted">
                <LoadingDots />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export type { ChatMessage, ChatThreadSlots, ChatThreadProps };
