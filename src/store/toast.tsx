'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface ToastContextValue {
  message: string;
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2200);
  }, []);

  return <ToastContext.Provider value={{ message, toast }}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
