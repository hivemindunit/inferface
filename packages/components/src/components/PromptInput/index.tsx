"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import type { ModelOption, PromptInputProps } from "./types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TOKEN_ESTIMATOR = (text: string) => Math.ceil(text.length / 4);

// ---------------------------------------------------------------------------
// Icons (inline SVG — no emoji)
// ---------------------------------------------------------------------------

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 13V3m-4 4l4-4 4 4" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28"
        strokeDashoffset="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PromptInput
// ---------------------------------------------------------------------------

export function PromptInput({
  value: valueProp,
  defaultValue = "",
  onChange,
  onSubmit,
  isLoading = false,
  onStop,
  placeholder = "Type a message...",
  maxRows = 8,
  minRows = 1,
  disabled = false,
  submitOn = "enter",
  showTokenEstimate = false,
  tokenEstimator = DEFAULT_TOKEN_ESTIMATOR,
  tokenWarningThreshold = 0.8,
  models,
  selectedModel,
  onModelChange,
  className,
  classNames,
  prepend,
  toolbarSlot,
  contextSlot,
}: PromptInputProps) {
  // Controlled / uncontrolled
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const textValue = isControlled ? valueProp : internalValue;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
    const minH = lineHeight * minRows;
    const maxH = lineHeight * maxRows;
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, minH), maxH)}px`;
  }, [minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [textValue, adjustHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      if (!isControlled) setInternalValue(v);
      onChange?.(v);
    },
    [isControlled, onChange]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = textValue.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit?.(trimmed);
    if (!isControlled) setInternalValue("");
  }, [textValue, isLoading, disabled, onSubmit, isControlled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (submitOn === "enter") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      } else {
        // cmd-enter
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
      }
    },
    [submitOn, handleSubmit]
  );

  // Token estimation
  const tokenCount = showTokenEstimate ? tokenEstimator(textValue) : 0;
  const selectedModelOption = models?.find((m) => m.id === selectedModel);
  const contextWindow = selectedModelOption?.contextWindow;
  const isOverThreshold =
    contextWindow != null && tokenCount > tokenWarningThreshold * contextWindow;

  return (
    <div className={cn("flex flex-col", classNames?.root, className)}>
      {/* Prepend slot */}
      {prepend}

      {/* Context slot */}
      {contextSlot && (
        <div className="px-3 py-2 border-b border-border">{contextSlot}</div>
      )}

      {/* Textarea */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={textValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={minRows}
          aria-label="Message input"
          className={cn(
            "w-full resize-none overflow-hidden rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            classNames?.textarea
          )}
        />
      </div>

      {/* Toolbar */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 pb-3",
          classNames?.toolbar
        )}
      >
        {/* Model selector */}
        {models && models.length > 0 && (
          <select
            value={selectedModel ?? ""}
            onChange={(e) => onModelChange?.(e.target.value)}
            aria-label="Select model"
            className={cn(
              "rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-emerald-500/50",
              classNames?.modelSelector
            )}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        {/* Token estimate */}
        {showTokenEstimate && (
          <span
            className={cn(
              "text-xs tabular-nums",
              isOverThreshold ? "text-destructive" : "text-muted-foreground/60",
              classNames?.tokenCount
            )}
            aria-live="polite"
          >
            ~{tokenCount} tokens
            {contextWindow != null && ` / ${contextWindow.toLocaleString()}`}
          </span>
        )}

        {/* Toolbar slot */}
        {toolbarSlot}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Submit / Stop button */}
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            aria-label="Stop generating"
            className={cn(
              "flex items-center gap-1.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors",
              classNames?.stopButton
            )}
          >
            <StopIcon /> Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!textValue.trim() || isLoading || disabled}
            aria-label={isLoading ? "Sending..." : "Send message"}
            className={cn(
              "flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              classNames?.submitButton
            )}
          >
            {isLoading ? <SpinnerIcon /> : <SendIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

export type { ModelOption, PromptInputProps };
