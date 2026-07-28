'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { API_BASE_URL } from '@/lib/api';

type State = 'idle' | 'working' | 'done' | 'error' | 'cooldown';

/**
 * Manual refresh. Re-prices markets on the Worker, then asks Next to re-fetch
 * the page. The server rate limits this to once a minute per client, so a 429 is
 * reported as a cooldown rather than a failure.
 */
export function RefreshButton() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    if (state === 'working') return;
    setState('working');

    try {
      const response = await fetch(`${API_BASE_URL}/api/refresh`, { method: 'POST' });

      if (response.status === 429) {
        setState('cooldown');
      } else if (!response.ok) {
        setState('error');
      } else {
        setState('done');
        startTransition(() => router.refresh());
      }
    } catch {
      setState('error');
    }

    setTimeout(() => setState('idle'), 4_000);
  };

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={state === 'working' || isPending}
      className="font-meta rounded-full border border-rule px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:border-rule-strong hover:text-ink disabled:opacity-50"
    >
      {label(state, isPending)}
    </button>
  );
}

function label(state: State, isPending: boolean): string {
  if (state === 'working' || isPending) return 'Refreshing';
  if (state === 'done') return 'Updated';
  if (state === 'cooldown') return 'Just a moment';
  if (state === 'error') return 'Unavailable';
  return 'Refresh';
}
