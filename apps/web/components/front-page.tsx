import type { StoryCluster } from '@morning-brief/shared';
import { Story } from './story';

/**
 * The front page: one lead running full width, the rest in two columns from the
 * medium breakpoint up. On a phone it is a single column, which is the reading
 * mode the spec optimises for.
 */
export function FrontPage({ stories }: { stories: readonly StoryCluster[] }) {
  const [lead, ...rest] = stories;
  if (!lead) return null;

  return (
    <section aria-labelledby="front-page-heading" className="py-8">
      <h2 id="front-page-heading" className="sr-only">
        Front page
      </h2>

      <Story story={lead} variant="lead" />

      {rest.length > 0 ? (
        <div className="mt-8 grid gap-8 border-t border-rule pt-8 md:grid-cols-2 md:gap-x-10">
          {rest.map((story) => (
            <Story key={story.id} story={story} variant="front" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
