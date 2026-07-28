import type { Edition } from '@morning-brief/shared';
import { formatRiyadhDate, formatRiyadhTime } from '@/lib/format';
import { RefreshButton } from './refresh-button';
import { ThemeToggle } from './theme-toggle';

interface MastheadProps {
  edition: Edition;
  isFallback: boolean;
}

const STATUS_COPY = {
  live: 'Live',
  updating: 'Updating',
  stale: 'Stale',
} as const;

export function Masthead({ edition, isFallback }: MastheadProps) {
  return (
    <header className="border-b-2 border-ink pb-4">
      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="label-rule">Morning Intelligence</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <RefreshButton />
        </div>
      </div>

      <h1 className="text-center font-serif text-[2.05rem] leading-[0.95] font-semibold tracking-[-0.02em] uppercase sm:text-5xl md:text-6xl">
        The Morning Brief
      </h1>

      <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-rule pt-3 sm:flex-row sm:justify-between">
        <p className="font-meta text-[11px] tracking-wide text-ink-muted">
          {formatRiyadhDate(edition.date)}
        </p>
        <div className="font-meta flex items-center gap-2 text-[11px] text-ink-muted">
          <span>Edition {formatRiyadhTime(edition.generatedAt)}</span>
          <StatusPill status={edition.status} />
        </div>
      </div>

      {isFallback ? (
        <p className="font-meta mt-3 border border-down/40 px-3 py-2 text-[11px] text-down">
          Showing a stored sample — this morning&rsquo;s edition could not be loaded.
        </p>
      ) : null}

      {edition.degraded.length > 0 ? <DegradedNote reasons={edition.degraded} /> : null}
    </header>
  );
}

function StatusPill({ status }: { status: Edition['status'] }) {
  const tone =
    status === 'live'
      ? 'text-up border-up/40'
      : status === 'updating'
        ? 'text-accent border-accent/40'
        : 'text-ink-faint border-rule';

  return (
    <span
      className={`font-meta inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${tone}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_COPY[status]}
    </span>
  );
}

/**
 * Names which fallbacks fired. A brief that quietly degrades is a brief you
 * can't calibrate against, so the masthead admits it in plain text.
 */
function DegradedNote({ reasons }: { reasons: readonly string[] }) {
  return (
    <details className="mt-3 border-t border-rule pt-2">
      <summary className="font-meta cursor-pointer text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Reduced service in this edition ({reasons.length})
      </summary>
      <ul className="font-meta mt-2 space-y-1 text-[11px] text-ink-muted">
        {reasons.map((reason) => (
          <li key={reason}>— {reason}</li>
        ))}
      </ul>
    </details>
  );
}
