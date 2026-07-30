import { SECTION_TITLES } from '@morning-brief/shared';
import { loadLatestEdition } from '@/lib/api';
import { formatRiyadhTime } from '@/lib/format';
import { FrontPage } from '@/components/front-page';
import { Masthead } from '@/components/masthead';
import { MarketsDashboard } from '@/components/markets-dashboard';
import { Section } from '@/components/section';
import { WatchToday } from '@/components/watch-today';

/**
 * Rendered per request rather than statically prerendered.
 *
 * With ISR, the OpenNext build bakes this page at compile time and — absent an
 * incremental cache backend — serves that snapshot indefinitely, so a newspaper
 * would show whatever was on the wires the day it was deployed. Rendering per
 * request costs a KV read on the API side and is always the current edition.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { edition, isFallback } = await loadLatestEdition();
  const { sections } = edition;

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 pb-16 sm:px-6 lg:max-w-[62rem]">
      <Masthead edition={edition} isFallback={isFallback} />

      <main>
        <FrontPage stories={edition.frontPage} />

        <Section id="section-ai" title={SECTION_TITLES.ai} stories={sections.ai} />
        <Section id="section-saudi" title={SECTION_TITLES.saudi} stories={sections.saudi} />
        <Section
          id="section-middle-east"
          title={SECTION_TITLES.middleEast}
          stories={sections.middleEast}
        />
        <Section id="section-us-world" title={SECTION_TITLES.usWorld} stories={sections.usWorld} />

        <MarketsDashboard markets={edition.markets} />

        {/* Market reporting prints directly under the dashboard it explains. */}
        {sections.markets ? (
          <Section id="section-markets" title={SECTION_TITLES.markets} stories={sections.markets} />
        ) : null}

        {/* Absent, not empty, when nothing meaningful turned up. */}
        {sections.radar ? (
          <Section id="section-radar" title={SECTION_TITLES.radar} stories={sections.radar} />
        ) : null}

        <WatchToday items={edition.watchToday} />
      </main>

      <footer className="border-t-2 border-ink pt-4">
        <p className="font-meta text-[11px] leading-relaxed text-ink-faint">
          {`Compiled ${formatRiyadhTime(edition.generatedAt)} from ${countSources(edition)} reports across the morning's wires. Every headline links to the original reporting.`}
        </p>
      </footer>
    </div>
  );
}

function countSources(edition: Awaited<ReturnType<typeof loadLatestEdition>>['edition']): number {
  const all = [
    ...edition.frontPage,
    ...edition.sections.ai,
    ...edition.sections.saudi,
    ...edition.sections.middleEast,
    ...edition.sections.usWorld,
    ...(edition.sections.markets ?? []),
    ...(edition.sections.radar ?? []),
  ];
  return all.reduce((total, story) => total + story.articleCount, 0);
}
