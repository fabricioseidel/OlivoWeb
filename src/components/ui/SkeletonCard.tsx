"use client";

export default function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm animate-pulse">
      <div className="aspect-square w-full rounded-t-2xl bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-6 bg-gray-200 rounded w-1/3 mt-4" />
        <div className="h-10 bg-gray-200 rounded-xl mt-4" />
      </div>
    </div>
  );
}
