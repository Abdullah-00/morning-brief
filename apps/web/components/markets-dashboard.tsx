import type { MarketQuote, MarketsBlock } from '@morning-brief/shared';
import { formatChangePercent, formatQuoteValue, formatRelative } from '@/lib/format';

/**
 * The markets table.
 *
 * Set as a typographic table rather than a grid of widgets — the spec rules out
 * dashboard aesthetics, and a newspaper prints its market data as a column of
 * figures. Numbers are tabular-lined so the decimal points stack.
 */
export function MarketsDashboard({ markets }: { markets: MarketsBlock }) {
  if (markets.quotes.length === 0) return null;

  return (
    <section aria-labelledby="markets" className="border-t border-rule py-8">
      <h2 id="markets" className="mb-6 flex items-baseline gap-3">
        <span className="font-serif text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
          Markets
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
        <span className="font-meta text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {markets.stale ? 'Delayed' : formatRelative(markets.asOf)}
        </span>
      </h2>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[22rem] border-collapse">
          <caption className="sr-only">
            Market levels and session change for tracked instruments
          </caption>
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className="label-rule py-2 text-left font-semibold">
                Instrument
              </th>
              <th scope="col" className="label-rule py-2 text-right font-semibold">
                Level
              </th>
              <th scope="col" className="label-rule py-2 text-right font-semibold">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {markets.quotes.map((quote) => (
              <QuoteRow key={quote.symbol} quote={quote} />
            ))}
          </tbody>
        </table>
      </div>

      {markets.aiSummary ? (
        <p className="mt-5 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-ink-muted">
          {markets.aiSummary}
        </p>
      ) : null}
    </section>
  );
}

function QuoteRow({ quote }: { quote: MarketQuote }) {
  const tone =
    quote.direction === 'up'
      ? 'text-up'
      : quote.direction === 'down'
        ? 'text-down'
        : 'text-ink-faint';

  const arrow = quote.direction === 'up' ? '▲' : quote.direction === 'down' ? '▼' : '';

  return (
    <tr className="border-b border-rule/60 last:border-b-0">
      <th scope="row" className="py-2.5 pr-3 text-left font-serif text-[0.9375rem] font-normal">
        {quote.label}
      </th>
      <td className="font-meta py-2.5 text-right text-[0.875rem]">{formatQuoteValue(quote)}</td>
      <td className={`font-meta py-2.5 text-right text-[0.875rem] ${tone}`}>
        {arrow ? (
          <span aria-hidden="true" className="mr-1 text-[0.6875rem]">
            {arrow}
          </span>
        ) : null}
        {formatChangePercent(quote.changePercent)}
        {quote.changePercent === null ? (
          <span className="sr-only">change unavailable</span>
        ) : null}
      </td>
    </tr>
  );
}
