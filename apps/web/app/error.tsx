'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[46rem] flex-col items-center justify-center px-6 text-center">
      <p className="label-rule">The Morning Brief</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold">The presses jammed</h1>
      <p className="mt-3 max-w-[42ch] text-ink-muted">
        This morning&rsquo;s edition could not be rendered. The briefing itself is unaffected —
        try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="font-meta mt-6 rounded-full border border-rule px-4 py-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
      >
        Reload
      </button>
    </div>
  );
}
