import type { WatchItem } from '@morning-brief/shared';

const KIND_LABELS: Record<WatchItem['kind'], string> = {
  earnings: 'Earnings',
  macro: 'Macro',
  centralBank: 'Central bank',
  geopolitical: 'Geopolitics',
  announcement: 'Scheduled',
};

export function WatchToday({ items }: { items: readonly WatchItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="watch-today" className="border-t border-rule py-8">
      <h2 id="watch-today" className="mb-6 flex items-baseline gap-3">
        <span className="font-serif text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
          What to Watch Today
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </h2>

      <ul className="max-w-[68ch] divide-y divide-rule">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
            <span className="font-meta w-20 shrink-0 pt-0.5 text-[10px] uppercase tracking-[0.12em] text-accent">
              {item.when}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-[1.45]">
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="headline-link"
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </p>
              <span className="font-meta text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                {KIND_LABELS[item.kind]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
