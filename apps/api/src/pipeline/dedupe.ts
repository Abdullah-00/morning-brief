import type { Article, Category, Region } from '@morning-brief/shared';
import { CATEGORIES } from '@morning-brief/shared';

/**
 * Deduplication and clustering. Spec: Step 3 — remove identical URLs, detect
 * near-duplicates, cluster semantically similar articles.
 *
 * Similarity is lexical (character trigrams over the headline) rather than
 * embedding-based. That is a deliberate trade: it is deterministic, unit
 * testable, costs no inference budget, and runs inside the free plan's CPU
 * ceiling. The embedding path is a later upgrade, not a prerequisite.
 */

/** Words that carry no signal about *which* story this is. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'as', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'it',
  'its', 'this', 'that', 'these', 'those', 'after', 'over', 'into', 'about',
  'says', 'say', 'said', 'new', 'more', 'up', 'down', 'out', 'has', 'have',
  'will', 'amid', 'his', 'her', 'their', 'they', 'he', 'she',
]);

/** Lowercase, strip punctuation, drop stopwords. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[‘’“”]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .join(' ')
    .trim();
}

/**
 * The newsroom's stock vocabulary: words that recur across unrelated stories
 * because they describe the shape of a news event rather than its subject. Two
 * headlines sharing only these are not covering the same thing.
 */
const GENERIC_TOKENS = new Set([
  // deal and funding language
  'startup', 'startups', 'raises', 'raise', 'raised', 'raising', 'million', 'billion',
  'trillion', 'funding', 'round', 'stake', 'deal', 'deals', 'buys', 'acquires',
  'acquisition', 'merger', 'valuation', 'investment', 'investors', 'investor',
  'fund', 'funds', 'shares', 'stock', 'stocks', 'market', 'markets', 'profit',
  'revenue', 'earnings', 'quarter', 'growth', 'sales', 'price', 'prices',
  // diplomacy and government language
  'phone', 'call', 'calls', 'talks', 'discuss', 'discusses', 'discussed',
  'meeting', 'meets', 'minister', 'ministers', 'ministry', 'foreign', 'counterparts',
  'counterpart', 'president', 'prime', 'official', 'officials', 'government',
  'leaders', 'leader', 'summit', 'visit', 'statement', 'relations', 'bilateral',
  'agreement', 'plan', 'plans', 'policy', 'deputy', 'secretary', 'envoy',
  // generic reporting verbs and nouns
  'says', 'said', 'warns', 'warned', 'urges', 'launches', 'launch', 'announces',
  'announced', 'unveils', 'reveals', 'reports', 'report', 'confirms', 'denies',
  'rejects', 'backs', 'seeks', 'faces', 'sets', 'takes', 'makes', 'holds',
  'receives', 'signs', 'names', 'reveal', 'expects', 'could', 'would', 'first',
  'latest', 'major', 'security', 'company', 'companies', 'business', 'industry',
  'group', 'people', 'week', 'year', 'years', 'today', 'update',
]);

/** Character trigrams — robust to word order and small rewordings between outlets. */
export function trigrams(text: string): Set<string> {
  const padded = ` ${text} `;
  const grams = new Set<string>();
  for (let index = 0; index + 3 <= padded.length; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const value of small) {
    if (large.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Two independent signals decide whether one event is being reported twice.
 *
 * Trigram overlap alone is too literal: two wires describing the same Hormuz
 * proposal in different words scored 0.24, while the pairs it does catch scored
 * 0.54. Rare-token containment separates those cases far more sharply — 0.43–0.71
 * for true pairs against 0.00 for unrelated ones — because outlets covering one
 * event independently converge on the same proper nouns even when every other
 * word differs.
 *
 * Containment on its own, though, merges template headlines. Seven unrelated
 * diplomatic phone calls collapsed into one story on {phone, call, discuss,
 * minister}, and two different funding rounds merged on {startup, raises,
 * million}. A containment match therefore also has to rest on at least one
 * shared token that actually names something.
 *
 * Rarity turns out not to identify those tokens. Measured over one morning's
 * ingest: startup=5, call=5, counterparts=4 against taiwan=6, brookfield=7,
 * hormuz=18 — the generic words are as rare as the names, because a day's news
 * is too small a corpus for frequency to mean much. What does separate them is
 * vocabulary, so GENERIC_TOKENS below carries the newsroom's stock words and a
 * shared token only counts as naming something if it is absent from that list.
 */
export const SIMILARITY_THRESHOLD = 0.45;
export const MIN_SHARED_RARE_TOKENS = 3;
export const CONTAINMENT_THRESHOLD = 0.4;

/** Fraction of the shorter headline's distinctive tokens that the longer one repeats. */
export function containment(shared: number, a: Set<string>, b: Set<string>): number {
  const smaller = Math.min(a.size, b.size);
  return smaller === 0 ? 0 : shared / smaller;
}

interface ComparableHeadline {
  grams: Set<string>;
  tokens: Set<string>;
}

export interface SharedTokenStats {
  /** Shared tokens that are uncommon across the ingest. */
  count: number;
  /** Whether any shared token is distinctive enough to name a specific thing. */
  hasDistinctive: boolean;
}

/** Applies the two-signal rule described above SIMILARITY_THRESHOLD. */
export function isSameStory(
  left: ComparableHeadline,
  right: ComparableHeadline,
  shared: SharedTokenStats,
): boolean {
  if (jaccard(left.grams, right.grams) >= SIMILARITY_THRESHOLD) return true;
  return (
    shared.count >= MIN_SHARED_RARE_TOKENS &&
    shared.hasDistinctive &&
    containment(shared.count, left.tokens, right.tokens) >= CONTAINMENT_THRESHOLD
  );
}

class UnionFind {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(node: number): number {
    let root = node;
    while (this.parent[root] !== root) {
      const next = this.parent[root] as number;
      this.parent[root] = this.parent[next] as number; // path halving
      root = this.parent[root] as number;
    }
    return root;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootB] = rootA;
  }
}

export interface ArticleCluster {
  id: string;
  articles: Article[];
  /** The article the headline and lead are taken from. */
  lead: Article;
  category: Category;
  region: Region;
  /** Distinct publisher count — corroboration, which is what ranking rewards. */
  independentSources: number;
  publishedAt: string;
}

/**
 * Where the cluster files. Taking the highest-priority category present read
 * well in theory and badly in practice: one Gulf paper covering a Japanese
 * earthquake was enough to print it under Middle East. What the outlets agree on
 * is the better signal, so this is a plurality vote with priority only breaking
 * ties.
 */
function dominantCategory(articles: readonly Article[]): Category {
  const votes = new Map<Category, number>();
  for (const article of articles) {
    votes.set(article.category, (votes.get(article.category) ?? 0) + 1);
  }

  let best = articles[0]?.category ?? 'global';
  let bestVotes = 0;
  for (const [category, count] of votes) {
    if (
      count > bestVotes ||
      (count === bestVotes && CATEGORIES[category].priority < CATEGORIES[best].priority)
    ) {
      best = category;
      bestVotes = count;
    }
  }
  return best;
}

/**
 * The region a cluster belongs to.
 *
 * A proxy article's region comes from its *feed registry entry*, not from the
 * story, so a US Treasury sanctions item carried by Arab News and Al Arabiya
 * used to vote itself `region: saudi`. The cluster's own category is the better
 * signal — it was inferred from the headline — so it decides wherever the two
 * disagree, and the per-article vote only breaks ties within a category.
 */
function dominantRegion(articles: readonly Article[], category: Category): Region {
  const impliedByCategory: Partial<Record<Category, Region>> = {
    saudi: 'saudi',
    saudiTech: 'saudi',
    middleEast: 'middleEast',
    usWorld: 'us',
    global: 'global',
  };
  const implied = impliedByCategory[category];
  if (implied) return implied;

  const counts = new Map<Region, number>();
  for (const article of articles) {
    counts.set(article.region, (counts.get(article.region) ?? 0) + 1);
  }
  let best: Region = articles[0]?.region ?? 'global';
  let bestCount = 0;
  for (const [region, count] of counts) {
    if (count > bestCount) {
      best = region;
      bestCount = count;
    }
  }
  return best;
}

/** Below this, an article has a stub description rather than usable reporting. */
export const MIN_BODY_CHARS = 160;

export function hasBody(article: Article): boolean {
  return article.content.length >= MIN_BODY_CHARS;
}

/**
 * Picks the article that best represents the cluster.
 *
 * Body text outranks credibility here, which looks backwards until you remember
 * that proxy sources (Reuters, AP, Arab News) arrive with credibility 0.95 and
 * an empty body. Letting one lead would hand the summariser a headline and
 * nothing else — exactly the setup that invites a model to invent detail. A
 * corroborating wire byline still shows in the source list either way.
 */
function pickLead(articles: readonly Article[]): Article {
  const leadScore = (article: Article): number =>
    (hasBody(article) ? 2 : 0) +
    article.sourceCredibility +
    // A fuller report is better to summarise from, with diminishing returns so
    // length never outweighs having a credible source at all.
    Math.min(article.content.length / 1_500, 1) * 0.75;

  return [...articles].sort((a, b) => {
    const difference = leadScore(b) - leadScore(a);
    if (Math.abs(difference) > 1e-6) return difference;
    return a.publishedAt.localeCompare(b.publishedAt);
  })[0] as Article;
}

/**
 * Collapses identical URLs, then joins near-duplicate headlines into clusters.
 *
 * Comparison is bucketed by category to keep this near-linear in practice: an AI
 * story is never the same event as a cyber advisory, and an all-pairs scan over
 * a full morning's ingest would not fit the CPU budget.
 */
export function clusterArticles(articles: readonly Article[]): ArticleCluster[] {
  // Pass 1 — exact canonical URL. Keep the most credible copy of each.
  const byUrl = new Map<string, Article>();
  for (const article of articles) {
    const existing = byUrl.get(article.url);
    if (!existing || article.sourceCredibility > existing.sourceCredibility) {
      byUrl.set(article.url, article);
    }
  }
  const unique = [...byUrl.values()];

  // Pass 2 — prepare comparison keys once.
  const prepared = unique.map((article) => {
    const normalized = normalizeTitle(article.title);
    return {
      article,
      normalized,
      grams: trigrams(normalized),
      tokens: new Set(normalized.split(' ').filter((token) => token.length >= 4)),
    };
  });

  const unionFind = new UnionFind(prepared.length);

  // Pass 2a — identical normalised headlines are the same story, full stop.
  const byNormalized = new Map<string, number>();
  prepared.forEach((entry, index) => {
    if (entry.normalized.length === 0) return;
    const seen = byNormalized.get(entry.normalized);
    if (seen === undefined) byNormalized.set(entry.normalized, index);
    else unionFind.union(seen, index);
  });

  // Pass 2b — near-duplicates, blocked by shared rare tokens.
  //
  // Comparing all pairs is quadratic in a morning's ingest and does not fit the
  // CPU budget. Blocking by category was cheap but wrong: the same Hormuz story
  // filed by one outlet as Gulf policy and another as Middle East security never
  // met. Rare tokens are a better block — two reports of one event almost always
  // share an uncommon word (a place, a company, a name), while common words are
  // skipped precisely because they would rebuild the quadratic scan.
  const tokenIndex = new Map<string, number[]>();
  prepared.forEach((entry, index) => {
    for (const token of entry.tokens) {
      const bucket = tokenIndex.get(token);
      if (bucket) bucket.push(index);
      else tokenIndex.set(token, [index]);
    }
  });

  const commonTokenCutoff = Math.max(12, Math.ceil(prepared.length * 0.02));
  const comparedPairs = new Set<number>();

  /** Tokens shared by both headlines that are rare across the whole ingest. */
  const sharedRareTokens = (a: Set<string>, b: Set<string>): SharedTokenStats => {
    let count = 0;
    let hasDistinctive = false;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const token of small) {
      if (!large.has(token)) continue;
      const frequency = tokenIndex.get(token)?.length ?? 0;
      if (frequency > commonTokenCutoff) continue;
      count += 1;
      if (!GENERIC_TOKENS.has(token)) hasDistinctive = true;
    }
    return { count, hasDistinctive };
  };

  for (const indices of tokenIndex.values()) {
    if (indices.length < 2 || indices.length > commonTokenCutoff) continue;
    for (let i = 0; i < indices.length; i += 1) {
      const leftIndex = indices[i] as number;
      const left = prepared[leftIndex];
      if (!left || left.grams.size === 0) continue;
      for (let j = i + 1; j < indices.length; j += 1) {
        const rightIndex = indices[j] as number;
        if (unionFind.find(leftIndex) === unionFind.find(rightIndex)) continue;

        // Two headlines can share several rare tokens; score the pair once.
        const pairKey = leftIndex * prepared.length + rightIndex;
        if (comparedPairs.has(pairKey)) continue;
        comparedPairs.add(pairKey);

        const right = prepared[rightIndex];
        if (!right || right.grams.size === 0) continue;

        if (isSameStory(left, right, sharedRareTokens(left.tokens, right.tokens))) {
          unionFind.union(leftIndex, rightIndex);
        }
      }
    }
  }

  // Pass 3 — materialise clusters, checking coherence as we go.
  const grouped = new Map<number, typeof prepared>();
  prepared.forEach((entry, index) => {
    const root = unionFind.find(index);
    const group = grouped.get(root);
    if (group) group.push(entry);
    else grouped.set(root, [entry]);
  });

  // Union-find is single-linkage: A~B and B~C puts A and C together even when
  // they have nothing in common, and a run of near-miss headlines can chain into
  // one sprawling non-story. Re-checking every member against the group's lead
  // breaks those chains; anything that fails leaves as its own cluster.
  const coherentGroups: (typeof prepared)[] = [];
  for (const group of grouped.values()) {
    if (group.length <= 2) {
      coherentGroups.push(group);
      continue;
    }

    const leadArticle = pickLead(group.map((entry) => entry.article));
    const lead = group.find((entry) => entry.article.id === leadArticle.id) ?? group[0];
    if (!lead) continue;

    const kept: typeof prepared = [];
    for (const entry of group) {
      if (entry === lead) {
        kept.push(entry);
      } else if (isSameStory(lead, entry, sharedRareTokens(lead.tokens, entry.tokens))) {
        kept.push(entry);
      } else {
        coherentGroups.push([entry]);
      }
    }
    coherentGroups.push(kept);
  }

  const clusters: ArticleCluster[] = [];
  for (const entries of coherentGroups) {
    const group = entries.map((entry) => entry.article);
    if (group.length === 0) continue;
    const lead = pickLead(group);
    const publishers = new Set(group.map((article) => article.source));
    // Newest timestamp in the cluster is when the story last moved.
    const publishedAt = group
      .map((article) => article.publishedAt)
      .sort()
      .at(-1) as string;

    const category = dominantCategory(group);

    clusters.push({
      id: lead.id,
      articles: group,
      lead,
      category,
      region: dominantRegion(group, category),
      independentSources: publishers.size,
      publishedAt,
    });
  }

  return clusters;
}
