/** A model option for the PromptInput model selector */
export interface ModelOption {
  id: string;
  label: string;
  description?: string;
  contextWindow?: number;
}

/** Props for the PromptInput component — a textarea with submit, stop, model selector, and token estimation */
export interface PromptInputProps {
  // === Core behavior ===
  /** Controlled value for the textarea */
  value?: string;
  /** Default uncontrolled value */
  defaultValue?: string;
  /** Called when textarea content changes */
  onChange?: (value: string) => void;
  /** Called when the user submits (Enter or Cmd+Enter depending on submitOn) */
  onSubmit?: (value: string, attachments?: File[]) => void;
  /** True while a request is in flight — disables input and shows loading state */
  isLoading?: boolean;
  /** Called when user clicks the stop button (only shown when isLoading + onStop are set) */
  onStop?: () => void;

  // === Textarea ===
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Maximum rows before textarea scrolls. Default: 8 */
  maxRows?: number;
  /** Minimum rows for the textarea. Default: 1 */
  minRows?: number;
  /** Disable the entire input */
  disabled?: boolean;

  // === Submit behavior ===
  /** Submit trigger key. Default: "enter" */
  submitOn?: "enter" | "cmd-enter";

  // === Token estimation ===
  /** Show estimated token count below the textarea. Default: false */
  showTokenEstimate?: boolean;
  /** Custom token estimator function. Default: Math.ceil(text.length / 4) */
  tokenEstimator?: (text: string) => number;
  /** Fraction of context window to trigger warning color. Default: 0.8 */
  tokenWarningThreshold?: number;

  // === Model selector ===
  /** Available models for the dropdown selector */
  models?: ModelOption[];
  /** Currently selected model ID */
  selectedModel?: string;
  /** Called when user changes model selection */
  onModelChange?: (modelId: string) => void;

  // === File attachments ===
  /** Accepted file types for the attachment button (e.g. "image/*"). If set, shows a paperclip button. */
  accept?: string;
  /** Called when files are attached (for external state management) */
  onAttach?: (files: File[]) => void;

  // === Appearance ===
  /** Class name on the root element */
  className?: string;
  /** Class names for inner sub-elements */
  classNames?: {
    root?: string;
    textarea?: string;
    toolbar?: string;
    submitButton?: string;
    stopButton?: string;
    tokenCount?: string;
    modelSelector?: string;
  };

  // === Slots ===
  /** Content rendered above the textarea */
  prepend?: React.ReactNode;
  /** Content rendered in the toolbar row */
  toolbarSlot?: React.ReactNode;
  /** Content rendered as context (e.g. attached files) above the textarea */
  contextSlot?: React.ReactNode;
}
