import { useCallback } from "react";
import type { ToolCall } from "../types/core";
import React from "react";

export interface GenerativeUIComponentProps<TProps = unknown> {
  props: TProps;
  onSubmit: (result: unknown) => void;
  onDismiss?: () => void;
}

export interface GenerativeUIRegistry {
  [componentName: string]: React.ComponentType<GenerativeUIComponentProps<unknown>>;
}

export interface UseGenerativeUIOptions {
  registry: GenerativeUIRegistry;
  onResult: (toolCallId: string, result: unknown) => void;
}

export interface UseGenerativeUIReturn {
  renderToolCall: (toolCall: ToolCall) => React.ReactNode | null;
  isRegistered: (name: string) => boolean;
}

export function useGenerativeUI(options: UseGenerativeUIOptions): UseGenerativeUIReturn {
  const renderToolCall = useCallback((toolCall: ToolCall): React.ReactNode | null => {
    const Component = options.registry[toolCall.function.name];
    if (!Component) return null;

    let parsedProps: unknown = {};
    try {
      parsedProps = JSON.parse(toolCall.function.arguments);
    } catch {
      return null;
    }

    return React.createElement(Component, {
      props: parsedProps,
      onSubmit: (result: unknown) => options.onResult(toolCall.id, result),
    });
  }, [options.registry, options.onResult]);

  const isRegistered = useCallback((name: string) => name in options.registry, [options.registry]);

  return { renderToolCall, isRegistered };
}
