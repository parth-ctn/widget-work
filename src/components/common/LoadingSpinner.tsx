// components/common/LoadingSpinner.tsx
// Reusable loading spinner — 3 animated dots
// Used in: ChatWidget (messages area), ChatCollectionsScreen (records loading),
//          FeaturedCollections (while fetching records)

import React from "react";

interface LoadingSpinnerProps {
  /** Optional wrapper style override */
  style?: React.CSSProperties;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Text shown below spinner (optional) */
  label?: string;
}

export default function LoadingSpinner({
  style,
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`loading-spinner${className ? ` ${className}` : ""}`}
      style={style}
    >
      <div className="spinner-bubble">
        <div className="spinner-dot" />
        <div className="spinner-dot" />
        <div className="spinner-dot" />
      </div>
      {label && (
        <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
          {label}
        </span>
      )}
    </div>
  );
}
