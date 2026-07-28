/**
 * The eight content priorities from the product spec, in rank order.
 *
 * `weight` feeds the ranking score; `section` decides which part of the paper a
 * story lands in. Keeping both here means ranking and layout can never drift
 * apart — every other module reads this table rather than hardcoding a category.
 */

export const CATEGORY_KEYS = [
  'ai',
  'saudi',
  'middleEast',
  'usWorld',
  'global',
  'markets',
  'cyber',
  'saudiTech',
] as const;

export type Category = (typeof CATEGORY_KEYS)[number];

/** Sections that hold story lists on the page. `markets` stories are narrative
 *  context for the markets summary rather than a standalone section. */
export const SECTION_KEYS = ['ai', 'saudi', 'middleEast', 'usWorld', 'radar'] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface CategoryMeta {
  /** Spec priority, 1 = highest. */
  readonly priority: number;
  /** Ranking weight, normalised 0–1. */
  readonly weight: number;
  /** Human label used in the UI. */
  readonly label: string;
  /** Where stories of this category are printed. `null` = markets narrative only. */
  readonly section: SectionKey | null;
  /** Extra credit for the spec's "relevance to Saudi/Middle East/AI" rule. */
  readonly regionBoost: number;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  ai: { priority: 1, weight: 1.0, label: 'Artificial Intelligence', section: 'ai', regionBoost: 1.0 },
  saudi: { priority: 2, weight: 0.9, label: 'Saudi Arabia', section: 'saudi', regionBoost: 1.0 },
  middleEast: { priority: 3, weight: 0.8, label: 'Middle East', section: 'middleEast', regionBoost: 0.8 },
  usWorld: { priority: 4, weight: 0.7, label: 'US Politics & Economy', section: 'usWorld', regionBoost: 0.2 },
  global: { priority: 5, weight: 0.6, label: 'World', section: 'usWorld', regionBoost: 0.2 },
  markets: { priority: 6, weight: 0.55, label: 'Markets', section: null, regionBoost: 0.3 },
  cyber: { priority: 7, weight: 0.5, label: 'Cybersecurity & Enterprise', section: 'radar', regionBoost: 0.3 },
  saudiTech: { priority: 8, weight: 0.45, label: 'Saudi Tech & Vision 2030', section: 'radar', regionBoost: 1.0 },
};

export const REGION_KEYS = ['saudi', 'middleEast', 'us', 'global'] as const;
export type Region = (typeof REGION_KEYS)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}

/** Section headings as printed in the paper. */
export const SECTION_TITLES: Record<SectionKey, string> = {
  ai: 'AI & Technology',
  saudi: 'Saudi Arabia',
  middleEast: 'Middle East',
  usWorld: 'US & World',
  radar: 'On My Radar',
};
