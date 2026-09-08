/** Squelette du formulaire de creation. */
export default function Loading() {
  return (
    <div>
      <div className="mb-7 space-y-2">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="skeleton h-80 w-full max-w-2xl rounded-[14px]" />
    </div>
  );
}
