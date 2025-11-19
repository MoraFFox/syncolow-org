import { useEffect } from 'react';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      
      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts, enabled]);
}
