"use client";

import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/lib/toast-context";

function ToastListener() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}

export function ClientToasts() {
  return (
    <ToastProvider>
      <ToastListener />
    </ToastProvider>
  );
}
