import React from "react";

export default function BookSkeleton() {
  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-2xl overflow-hidden shadow-md flex flex-col h-full animate-pulse" id="book-skeleton">
      {/* Cover Frame Placeholder */}
      <div className="aspect-[3/4] bg-zinc-900 border-b border-zinc-800 relative flex items-center justify-center overflow-hidden">
        <div className="w-12 h-16 bg-zinc-800 rounded-md opacity-35" />
      </div>

      {/* Book Metadata details */}
      <div className="p-4 flex-grow flex flex-col justify-between space-y-4">
        <div>
          {/* Tags */}
          <div className="flex gap-1.5 mb-2.5">
            <div className="h-4.5 w-16 bg-zinc-800 rounded-full" />
            <div className="h-4.5 w-10 bg-zinc-800 rounded-full" />
          </div>
          
          {/* Title */}
          <div className="h-5 bg-zinc-800 rounded-md w-3/4 mb-2" />
          
          {/* Author */}
          <div className="h-3 bg-zinc-800 rounded-md w-1/2 mb-3.5" />
          
          {/* Description (2 lines placeholder) */}
          <div className="space-y-1.5">
            <div className="h-3 bg-zinc-800/60 rounded-md w-full" />
            <div className="h-3 bg-zinc-800/60 rounded-md w-5/6" />
          </div>
        </div>

        {/* Buttons Placeholder */}
        <div className="pt-2 border-t border-zinc-800 flex gap-1.5">
          <div className="h-10 bg-zinc-800 rounded-xl flex-grow" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl shrink-0" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function BookSkeletonLoader({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <BookSkeleton key={idx} />
      ))}
    </div>
  );
}
