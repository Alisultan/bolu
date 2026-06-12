'use client';

import { useEffect, useRef, useState } from 'react';

export type Feedback = {
  type: 'success' | 'error';
  message: string;
  visible: boolean;
} | null;

export function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  const styles =
    feedback.type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm transition-all duration-300 ease-out ${
        feedback.visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-1 opacity-0'
      } ${styles}`}
    >
      {feedback.message}
    </p>
  );
}

export function useFeedback(duration = 2500) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (removeTimeoutRef.current) {
      clearTimeout(removeTimeoutRef.current);
      removeTimeoutRef.current = null;
    }
  };

  const clearFeedback = () => {
    clearTimers();

    setFeedback(null);
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    clearTimers();

    setFeedback({ type, message, visible: false });
    requestAnimationFrame(() => {
      setFeedback({ type, message, visible: true });
    });
    timeoutRef.current = setTimeout(() => {
      setFeedback((currentFeedback) =>
        currentFeedback
          ? { ...currentFeedback, visible: false }
          : currentFeedback
      );
      timeoutRef.current = null;
      removeTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        removeTimeoutRef.current = null;
      }, 300);
    }, duration);
  };

  useEffect(
    () => () => {
      clearTimers();
    },
    []
  );

  return {
    feedback,
    clearFeedback,
    showError: (message: string) => showFeedback('error', message),
    showSuccess: (message: string) => showFeedback('success', message),
  };
}
