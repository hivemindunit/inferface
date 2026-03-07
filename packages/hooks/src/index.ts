// @inferface/hooks — Core engine for AI-app UI
// Exports all hooks

export { useStream } from './useStream'
export { useChat } from './useChat'
export { useCompletion } from './useCompletion'
export { useToolCalls } from './useToolCalls'

export type { UseStreamOptions, UseStreamReturn } from './useStream'
export type { UseChatOptions, UseChatReturn, Message, Role } from './useChat'
export type { UseCompletionOptions, UseCompletionReturn } from './useCompletion'
export type { ToolCall, ToolResult, UseToolCallsReturn } from './useToolCalls'
