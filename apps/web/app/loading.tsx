export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 pb-16 sm:px-6 lg:max-w-[62rem]">
      <div className="border-b-2 border-ink pb-4 pt-12">
        <h1 className="text-center font-serif text-[2.05rem] leading-[0.95] font-semibold tracking-[-0.02em] uppercase sm:text-5xl md:text-6xl">
          The Morning Brief
        </h1>
        <p className="font-meta mt-4 border-t border-rule pt-3 text-center text-[11px] text-ink-faint">
          Setting this morning&rsquo;s edition…
        </p>
      </div>

      <div className="space-y-6 py-8" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2">
            <div className="h-3 w-24 rounded bg-rule/60" />
            <div className="h-6 w-4/5 rounded bg-rule/50" />
            <div className="h-3 w-full rounded bg-rule/30" />
            <div className="h-3 w-11/12 rounded bg-rule/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
