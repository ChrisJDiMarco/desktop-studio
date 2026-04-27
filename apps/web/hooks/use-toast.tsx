"use client";

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant } = options;
    if (variant === "destructive") {
      sonnerToast.error(title, { description });
    } else {
      sonnerToast(title, { description });
    }
  };

  return { toast };
}
