import {
  CATEGORIES,
  editionSchema,
  type Edition,
  type EditionSections,
  type EditionStatus,
  type EditionTrigger,
  type SectionKey,
  type StoryCluster,
  type MarketsBlock,
  type WatchItem,
} from '@morning-brief/shared';

/**
 * Assembles the finished edition. Spec: Page Structure — a front page of 3–5
 * stories, then the standing sections.
 */

export const FRONT_PAGE_MIN = 3;
export const FRONT_PAGE_MAX = 5;
/** Spec: "Only shown when meaningful stories exist." */
export const RADAR_MIN_STORIES = 2;
/** Keeps a section from becoming a list nobody reads to the end of. */
export const SECTION_MAX = 6;

export interface ComposeInput {
  date: string;
  generatedAt: string;
  stories: readonly StoryCluster[];
  markets: MarketsBlock;
  watchToday: readonly WatchItem[];
  degraded: readonly string[];
  status?: EditionStatus;
  publishedVia?: EditionTrigger;
}

/**
 * Picks the front page.
 *
 * Ranking alone would hand the whole page to whichever beat had a loud morning —
 * five AI stories is a newsletter, not a front page — so no category takes more
 * than two of the slots. Stories with no reporting behind them are barred
 * outright: the lead of the paper should never be a headline we couldn't
 * corroborate or summarise.
 */
export function selectFrontPage(stories: readonly StoryCluster[]): StoryCluster[] {
  const eligible = stories.filter((story) => story.summary.trim().length > 0);

  const chosen: StoryCluster[] = [];
  const perCategory = new Map<string, number>();

  for (const story of eligible) {
    if (chosen.length >= FRONT_PAGE_MAX) break;
    const used = perCategory.get(story.category) ?? 0;
    if (used >= 2) continue;
    chosen.push(story);
    perCategory.set(story.category, used + 1);
  }

  // If the diversity rule starved the page, top it up in rank order.
  if (chosen.length < FRONT_PAGE_MIN) {
    for (const story of eligible) {
      if (chosen.length >= FRONT_PAGE_MIN) break;
      if (chosen.some((existing) => existing.id === story.id)) continue;
      chosen.push(story);
    }
  }

  return chosen;
}

/** Routes the remaining stories to their section, per the category table. */
export function selectSections(
  stories: readonly StoryCluster[],
  frontPage: readonly StoryCluster[],
): EditionSections {
  const onFrontPage = new Set(frontPage.map((story) => story.id));
  const buckets: Record<SectionKey, StoryCluster[]> = {
    ai: [],
    saudi: [],
    middleEast: [],
    usWorld: [],
    radar: [],
  };

  for (const story of stories) {
    if (onFrontPage.has(story.id)) continue;
    const section = CATEGORIES[story.category].section;
    if (!section) continue;
    const bucket = buckets[section];
    if (bucket.length < SECTION_MAX) bucket.push(story);
  }

  const sections: EditionSections = {
    ai: buckets.ai,
    saudi: buckets.saudi,
    middleEast: buckets.middleEast,
    usWorld: buckets.usWorld,
  };

  if (buckets.radar.length >= RADAR_MIN_STORIES) {
    sections.radar = buckets.radar;
  }

  return sections;
}

/**
 * Builds and validates the edition. Throws if the result doesn't satisfy the
 * shared schema — better to fail the run than to store something the frontend
 * will render half of.
 */
export function composeEdition(input: ComposeInput): Edition {
  const ranked = [...input.stories].sort((a, b) => b.score - a.score);
  const frontPage = selectFrontPage(ranked);
  const sections = selectSections(ranked, frontPage);

  const degraded = [...input.degraded];
  if (input.markets.stale) degraded.push('markets:stale snapshot');
  if (frontPage.length < FRONT_PAGE_MIN) {
    degraded.push(`frontPage:only ${frontPage.length} stories available`);
  }

  const edition: Edition = {
    date: input.date,
    generatedAt: input.generatedAt,
    status: input.status ?? 'live',
    publishedVia: input.publishedVia ?? 'manual',
    degraded,
    frontPage,
    sections,
    markets: input.markets,
    watchToday: [...input.watchToday],
  };

  return editionSchema.parse(edition);
}
