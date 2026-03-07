export interface ModelOption {
  id: string;
  label: string;
  description?: string;
  contextWindow?: number;
}

export interface PromptInputProps {
  // === Core behavior ===
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  isLoading?: boolean;
  onStop?: () => void;

  // === Textarea ===
  placeholder?: string;
  maxRows?: number; // default: 8
  minRows?: number; // default: 1
  disabled?: boolean;

  // === Submit behavior ===
  submitOn?: "enter" | "cmd-enter"; // default: "enter"

  // === Token estimation ===
  showTokenEstimate?: boolean; // default: false
  tokenEstimator?: (text: string) => number;
  tokenWarningThreshold?: number; // default: 0.8

  // === Model selector ===
  models?: ModelOption[];
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;

  // === Appearance ===
  className?: string;
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
  prepend?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  contextSlot?: React.ReactNode;
}
