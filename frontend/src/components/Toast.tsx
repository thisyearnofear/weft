"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import styles from "./Toast.module.css";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  duration?: number;
}

export function Toast({ message, type = "info", onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <AlertCircle size={18} />,
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.icon}>{icons[type]}</span>
      <span className={styles.message}>{message}</span>
      {onClose && (
        <button onClick={() => { setIsVisible(false); onClose(); }} className={styles.close}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}