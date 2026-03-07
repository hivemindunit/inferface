export interface StreamingTextProps {
  /** The text content — can be partial/streaming */
  content: string;

  /** True while streaming (shows cursor, disables full markdown parse) */
  isStreaming?: boolean;

  /** Render as markdown. Default: true */
  markdown?: boolean;

  /** Syntax highlighting theme. Uses shiki under the hood. Default: 'github-dark' */
  codeTheme?: string;

  /**
   * Streaming render strategy.
   * 'token' — re-render on every chunk (default, most responsive)
   * 'word' — buffer to word boundaries
   * 'sentence' — buffer to sentence boundaries
   */
  renderMode?: "token" | "word" | "sentence";

  /** Show blinking cursor at end of streaming content. Default: true */
  showCursor?: boolean;

  /** Custom cursor element */
  cursor?: React.ReactNode;

  /** Class on root element */
  className?: string;

  /** Class names for inner elements */
  classNames?: {
    root?: string;
    prose?: string;
    codeBlock?: string;
    inlineCode?: string;
    cursor?: string;
  };

  /** Called when streaming completes (isStreaming transitions true→false) */
  onStreamComplete?: (content: string) => void;
}
