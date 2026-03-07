import type { ContentPart, ToolCall, UseChatReturn } from "@inferface/hooks";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  createdAt?: Date;
  toolCalls?: ToolCall[];
}

export interface ChatThreadSlots {
  /** Custom avatar renderer per role */
  avatar?: (role: ChatMessage["role"]) => React.ReactNode;

  /** Override the entire message bubble */
  messageBubble?: (message: ChatMessage, index: number) => React.ReactNode;

  /** Render after each assistant message (e.g. feedback buttons) */
  messageActions?: (message: ChatMessage) => React.ReactNode;

  /** Loading indicator while streaming */
  loadingIndicator?: React.ReactNode;

  /** Empty state when no messages */
  emptyState?: React.ReactNode;
}

export interface ChatThreadProps {
  // === Controlled (headless) mode ===
  messages?: ChatMessage[];
  onRegenerate?: (messageId: string) => void;
  isLoading?: boolean;
  streamingContent?: string;

  // === Hook-wired mode ===
  chat?: UseChatReturn;

  // === Appearance ===
  className?: string;
  classNames?: {
    root?: string;
    messageList?: string;
    messageBubble?: string;
    userBubble?: string;
    assistantBubble?: string;
    avatar?: string;
    actions?: string;
  };

  // === Behavior ===
  /** Auto-scroll to bottom when new messages arrive. Default: true */
  autoScroll?: boolean;
  /** Show copy button on assistant messages. Default: true */
  showCopyButton?: boolean;
  /** Show regenerate button on last assistant message. Default: true */
  showRegenerateButton?: boolean;
  /** Render markdown in assistant messages. Default: true */
  renderMarkdown?: boolean;

  // === Slots ===
  slots?: ChatThreadSlots;
}
