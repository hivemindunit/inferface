// Public API for @inferface/components
// ---------------------------------------------------------------------------

// Re-export cn utility for downstream consumers
export { cn } from "./lib/utils";

// Components
export { StreamingText } from "./components/StreamingText";
export type { StreamingTextProps } from "./components/StreamingText/types";

export { ChatThread } from "./components/ChatThread";
export type { ChatThreadProps, ChatMessage, ChatThreadSlots } from "./components/ChatThread/types";

export { PromptInput } from "./components/PromptInput";
export type { PromptInputProps, ModelOption } from "./components/PromptInput/types";
