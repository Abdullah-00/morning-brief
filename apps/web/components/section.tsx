import type { StoryCluster } from '@morning-brief/shared';
import { Story } from './story';

interface SectionProps {
  title: string;
  stories: readonly StoryCluster[];
  id: string;
}

/** A standing section. Renders nothing when empty rather than printing a stub. */
export function Section({ title, stories, id }: SectionProps) {
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby={id} className="border-t border-rule py-8">
      <h2 id={id} className="mb-6 flex items-baseline gap-3">
        <span className="font-serif text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
          {title}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </h2>

      <div className="grid gap-8 md:grid-cols-2 md:gap-x-10">
        {stories.map((story) => (
          <Story key={story.id} story={story} variant="section" />
        ))}
      </div>
    </section>
  );
}
