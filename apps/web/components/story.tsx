import type { StoryCluster } from '@morning-brief/shared';
import { CATEGORIES } from '@morning-brief/shared';
import { formatRelative } from '@/lib/format';

interface StoryProps {
  story: StoryCluster;
  /** The lead sets the whole page's hierarchy, so it gets its own treatment. */
  variant?: 'lead' | 'front' | 'section';
}

export function Story({ story, variant = 'section' }: StoryProps) {
  const primaryUrl = story.sources[0]?.url;

  const headlineClass =
    variant === 'lead'
      ? 'text-[1.75rem] leading-[1.08] sm:text-4xl md:text-[2.75rem]'
      : variant === 'front'
        ? 'text-[1.3rem] leading-[1.15] sm:text-2xl'
        : 'text-[1.1rem] leading-[1.2] sm:text-xl';

  return (
    <article className="max-w-[68ch]">
      <div className="font-meta mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        <span className="text-accent">{CATEGORIES[story.category].label}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={story.publishedAt}>{formatRelative(story.publishedAt)}</time>
        {story.articleCount > 1 ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{story.articleCount} sources</span>
          </>
        ) : null}
      </div>

      <h3 className={`font-serif font-semibold tracking-[-0.015em] ${headlineClass}`}>
        {primaryUrl ? (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="headline-link"
          >
            {story.headline}
          </a>
        ) : (
          story.headline
        )}
      </h3>

      {story.summary ? (
        <p
          className={`mt-3 text-ink-muted ${
            variant === 'lead'
              ? 'lead-body text-[1.0625rem] leading-[1.65] sm:text-lg'
              : 'text-[0.9375rem] leading-[1.6]'
          }`}
        >
          {story.summary}
        </p>
      ) : null}

      {story.whyItMatters ? (
        <p className="mt-3 border-l-2 border-accent/50 pl-3 text-[0.875rem] leading-[1.55] text-ink">
          <span className="label-rule mr-1.5 text-accent">Why it matters</span>
          {story.whyItMatters}
        </p>
      ) : null}

      <SourceList story={story} />
    </article>
  );
}

function SourceList({ story }: { story: StoryCluster }) {
  return (
    <div className="font-meta mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="text-ink-faint">Sources</span>
      {story.sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-rule text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
        >
          {source.name}
        </a>
      ))}
      {!story.aiGenerated ? (
        <span
          className="text-ink-faint"
          title="Summarised by extracting the publisher's own sentences rather than by a model"
        >
          · extract
        </span>
      ) : null}
    </div>
  );
}
