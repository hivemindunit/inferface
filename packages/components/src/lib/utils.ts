import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with clsx — the standard shadcn `cn()` helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
