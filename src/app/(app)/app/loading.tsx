export default function Loading() {
  return (
    <div>
      <div className="mb-7 space-y-2">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="mb-4 flex gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2.5">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton h-20 w-full rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
