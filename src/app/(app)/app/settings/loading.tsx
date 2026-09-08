/** Squelette des reglages : la coquille s'affiche pendant la lecture. */
export default function Loading() {
  return (
    <div>
      <div className="mb-7 space-y-2">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-4 w-72" />
      </div>
      <div className="max-w-2xl space-y-6">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-40 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
