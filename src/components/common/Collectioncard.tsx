// CollectionRecordCard.tsx
// ✅ Common component for iframe-based collection cards
// Used by: ChatWidget (FeaturedSlider) and ChatCollectionsScreen
// Supports: horizontal (row) and vertical (column) layout

import { useRef } from "react";
import type { CollectionTemplate } from "../../types/index";
import { buildCollectionRecordIframeDoc } from "../../utils/collections";

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "#e53535" : "none"}
    stroke={filled ? "#e53535" : "#333"}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#333"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#333"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type RecordActionState = {
  likeCount: number;
  viewCount: number;
  shareCount: number;
  isLiked: boolean;
};

export type CollectionRecordCardProps = {
  /** Raw record data from API */
  record: any;
  /** Collection template (html, css, js, output_ratio, etc.) */
  template: CollectionTemplate;
  /** Index of this card in the list (used for keying iframe title) */e
  recordIndex: number;
  /** Current like/view/share state for this record */
  actionState: RecordActionState;
  /**
   * Layout direction:
   * - "horizontal" → flexShrink: 0, fits inside a horizontal scroll row (FeaturedSlider)
   * - "vertical"   → full width column card (ChatCollectionsScreen grid)
   */
  layout?: "horizontal" | "vertical";
  /**
   * Ref map to store iframe element references by recordId.
   * Parent uses this to postMessage like toggle requests to the iframe.
   */
  iframeRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  /**
   * Ref map: recordId → collectionName
   * Parent uses this when making analytics API calls.
   */
  recordCollectionMap: React.MutableRefObject<Record<string, string>>;
  /**
   * Ref map: recordId → record URL
   * Parent uses this to open the record URL on share/card click.
   */
  recordUrlMap: React.MutableRefObject<Record<string, string>>;
  /** Called when user clicks the like button */
  onLikeToggle: (recordId: string) => void;
  /** Called when user clicks the share button */
  onShareClick: (recordId: string) => void;
  /** Optional: called when user clicks the card body area */
  onCardClick?: (recordId: string) => void;
};

// ── CardActionButtons ─────────────────────────────────────────────────────────

const CardActionButtons = ({
  recordId,
  state,
  onLikeToggle,
  onShareClick,
}: {
  recordId: string;
  state: RecordActionState;
  onLikeToggle: (recordId: string) => void;
  onShareClick: (recordId: string) => void;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap:"12px",
      width: "100%",
      boxSizing: "border-box",
      padding: "4px 1px 2px 1px",
    }}
  >
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {/* Like button */}
      <button
        type="button"
        onClick={() => onLikeToggle(recordId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: state.isLiked ? "#fff0f0" : "#fff",
          border: `1px solid ${state.isLiked ? "#f87171" : "#d0d0d0"}`,
          borderRadius: "5px",
          padding: "4px 10px",
          cursor: "pointer",
          fontSize: "9px",
          fontWeight: 500,
          color: state.isLiked ? "#e53535" : "#222",
          fontFamily: "Arial, sans-serif",
          flexShrink: 0,
          lineHeight: 1,
          whiteSpace: "nowrap",
          transition: "background 0.15s, border-color 0.15s, color 0.15s",
        }}
      >
        <HeartIcon filled={state.isLiked} />
        <span>{state.likeCount}</span>
      </button>

      {/* View count (read-only) */}
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "#fff",
          border: "1px solid #d0d0d0",
          borderRadius: "5px",
          padding: "4px 10px",
          cursor: "default",
          fontSize: "9px",
          fontWeight: 500,
          color: "#222",
          fontFamily: "Arial, sans-serif",
          flexShrink: 0,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <EyeIcon />
        <span>{state.viewCount}</span>
      </button>
    </div>

    {/* Share button */}
    <button
      type="button"
      onClick={() => onShareClick(recordId)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "#fff",
        border: "1px solid #d0d0d0",
        borderRadius: "5px",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "9px",
        fontWeight: 500,
        color: "#222",
        fontFamily: "Arial, sans-serif",
        flexShrink: 0,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <ShareIcon />
      <span>{state.shareCount}</span>
    </button>
  </div>
);

// ── CollectionRecordCard (main export) ────────────────────────────────────────

export const CollectionRecordCard = ({
  record,
  template,
  recordIndex,
  actionState,
  layout = "vertical",
  iframeRefs,
  recordCollectionMap,
  recordUrlMap,
  onLikeToggle,
  onShareClick,
  onCardClick,
}: CollectionRecordCardProps) => {
  const iframeDoc = buildCollectionRecordIframeDoc(
    record,
    template,
    recordIndex,
  );
  const { srcDoc, frameWidth, frameHeight, recordId, collectionName } =
    iframeDoc;

  // Populate parent ref maps so parent can use recordId for analytics/navigation
  const resolvedCollectionName =
    record?.collection_name ?? record?.collection ?? collectionName;
  const resolvedUrl =
    record?.url ?? record?.link ?? record?.page_url ?? record?.website ?? "";
  recordCollectionMap.current[recordId] = resolvedCollectionName;
  recordUrlMap.current[recordId] = resolvedUrl;

  // Fallback state if parent hasn't populated yet
  const state: RecordActionState = actionState ?? {
    likeCount: iframeDoc.initialLikeCount,
    viewCount: iframeDoc.initialViewCount,
    shareCount: iframeDoc.initialShareCount,
    isLiked: false,
  };

  return (
    <div
      data-record-id={recordId}
      data-collection-name={resolvedCollectionName}
      style={{
        display: "flex",
        flexDirection: "column",
        // horizontal → used inside FeaturedSlider (horizontal scroll row)
        // vertical   → used inside ChatCollectionsScreen (grid/column layout)
        flexShrink: layout === "horizontal" ? 0 : undefined,
        width: layout === "vertical" ? "100%" : undefined,
        boxSizing: "border-box",
      }}
    >
      <iframe
        ref={(el) => {
          iframeRefs.current[recordId] = el;
        }}
        title={`Collection record ${recordIndex + 1}`}
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{
          width: frameWidth,
          height: frameHeight,
          display: "block",
          border: "none",
          // vertical layout → stretch to fill container width
          ...(layout === "vertical"
            ? { width: "100%", maxWidth: frameWidth }
            : {}),
        }}
        srcDoc={srcDoc}
      />
      <CardActionButtons
        recordId={recordId}
        state={state}
        onLikeToggle={onLikeToggle}
        onShareClick={onShareClick}
      />
    </div>
  );
};

export default CollectionRecordCard;
``