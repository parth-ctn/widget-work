// components/common/EmptyState.tsx
// Reusable empty/error/info state message
// Used in: ChatCollectionsScreen ("No records found", "Loading...", errors),
//          ChatHistoryList ("No chat history available"),
//          FeaturedCollections ("Template unavailable")

import React from "react";

interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional variant for styling */
  variant?: "default" | "error" | "loading";
  /** Optional className override */
  className?: string;
  /** Optional wrapper style */
  style?: React.CSSProperties;
}

export default function EmptyState({
  message,
  variant = "default",
  className,
  style,
}: EmptyStateProps) {
  const baseClass = "collection-state";
  const variantClass = variant === "error" ? " error" : "";
  const extraClass = className ? ` ${className}` : "";

  return (
    <div className={`${baseClass}${variantClass}${extraClass}`} style={style}>
      {message}
    </div>
  );
}
