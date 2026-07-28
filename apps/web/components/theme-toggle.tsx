'use client';

import { useEffect, useState } from 'react';

const THEMES = ['sepia', 'light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'morning-brief-theme';

/**
 * Paper stock selector. Writes `data-theme` on <html>, which the stylesheet keys
 * off; the inline script in layout.tsx applies the stored value before paint so
 * the page never flashes the wrong paper.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('sepia');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.dataset.theme as Theme | undefined;
    if (stored && THEMES.includes(stored)) setTheme(stored);
    setMounted(true);
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice simply won't persist.
    }
  };

  return (
    <div
      className="flex items-center gap-px rounded-full border border-rule p-0.5"
      role="group"
      aria-label="Reading theme"
    >
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => apply(option)}
          aria-pressed={mounted ? theme === option : undefined}
          className={`font-meta rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
            mounted && theme === option
              ? 'bg-ink text-paper'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
