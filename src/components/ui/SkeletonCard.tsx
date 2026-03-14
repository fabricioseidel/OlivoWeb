"use client";

export default function SkeletonCard() {
  return (
    <div className="rounded-[2.5rem] bg-white border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-square w-full bg-gray-50 flex items-center justify-center p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-[2rem]" />
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded w-1/4" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="pt-4 flex items-center justify-between border-t border-gray-50">
            <div className="h-6 bg-gray-100 rounded w-1/3" />
            <div className="h-10 w-10 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
