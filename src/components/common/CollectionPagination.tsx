// components/common/CollectionPagination.tsx
// Reusable Previous / Page X of Y / Next pagination bar
// Used in: ChatCollectionsScreen
// Can be reused anywhere pagination is needed inside the widget

import React from "react";

interface CollectionPaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Optional className for the wrapper div */
  className?: string;
}

export default function CollectionPagination({
  page,
  totalPages,
  onPrev,
  onNext,
  className,
}: CollectionPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={className ?? "collection-pagination"}>
      <button
        type="button"
        className="collection-page-btn"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span className="collection-page-info">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="collection-page-btn"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}
