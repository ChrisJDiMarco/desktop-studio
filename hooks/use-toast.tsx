"use client";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const toast = (_options: ToastOptions) => {
    void _options;
    // Keep the API available for host flows and generated Thinklets, but leave
    // the visible bottom-right notification layer off.
  };

  return { toast };
}
