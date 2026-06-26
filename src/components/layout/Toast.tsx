'use client';

import { useToast } from '@/store/toast';

export default function Toast() {
  const { message } = useToast();
  return (
    <div id="toast" className={`toast${message ? ' show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
