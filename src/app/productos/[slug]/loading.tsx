export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-200 rounded-[2rem]" />
        <div className="space-y-5">
          <div className="h-8 w-3/4 bg-gray-200 rounded-xl" />
          <div className="h-6 w-32 bg-gray-200 rounded-xl" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
          <div className="h-14 w-full bg-gray-200 rounded-2xl mt-8" />
        </div>
      </div>
    </div>
  );
}
