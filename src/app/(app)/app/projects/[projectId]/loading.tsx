export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-6 h-9 w-64" />
      <div className="skeleton mb-8 h-1.5 w-full" />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-24 w-full rounded-[14px]" />
          ))}
        </div>
        <div className="grid gap-6">
          {[0, 1].map((index) => (
            <div key={index} className="skeleton h-40 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
