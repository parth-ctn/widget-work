// 


// Collectioncard.tsx
// ✅ FIXED:
//   1. recordId hve prop tarke aave che — andar buildCollectionRecordIframeDoc FARI call nathi thati
//   2. Map logic (recordCollectionMap, recordUrlMap) card ni andar j handle thay che
//   3. No ID drift — actionState always matches correctly

import React from "react";
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
  /** Index of this card in the list (used for iframe title + iframeDoc generation) */
  recordIndex: number;
  /**
   * ✅ recordId parent compute kare che ane prop tarke pass kare che
   * This avoids double-calling buildCollectionRecordIframeDoc and ID drift
   */
  recordId: string;
  /** Current like/view/share state for this record */
  actionState: RecordActionState;
  /**
   * Layout direction:
   * - "horizontal" → flexShrink: 0, fits inside a horizontal scroll row (FeaturedSlider)
   * - "vertical"   → full width column card (ChatCollectionsScreen grid)
   */
  layout?: "horizontal" | "vertical";
  /** Ref map: recordId → HTMLIFrameElement — parent uses for postMessage like toggle */
  iframeRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  /**
   * ✅ Ref map: recordId → collectionName
   * CollectionRecordCard populates this internally so parent does NOT need to do it separately
   */
  recordCollectionMap: React.MutableRefObject<Record<string, string>>;
  /**
   * ✅ Ref map: recordId → record URL
   * CollectionRecordCard populates this internally so parent does NOT need to do it separately
   */
  recordUrlMap: React.MutableRefObject<Record<string, string>>;
  /** Called when user clicks the like button */
  onLikeToggle: (recordId: string) => void;
  /** Called when user clicks the share button */
  onShareClick: (recordId: string) => void;
  /** Optional: called when user clicks the card body area */
  onCardClick?: (recordId: string) => void;
  /**
   * ✅ NEW: visible pixel width for horizontal layout cards
   * FeaturedSlider passes this so iframe scales to exactly fit 2 cards
   * If not provided, card renders at full backend frameWidth (no scale)
   */
  visibleWidth?: number;
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
      gap: "12px",
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
  recordId,
  actionState,
  layout = "vertical",
  iframeRefs,
  recordCollectionMap,
  recordUrlMap,
  onLikeToggle,
  onShareClick,
  onCardClick,
  visibleWidth,
}: CollectionRecordCardProps) => {
  // ✅ buildCollectionRecordIframeDoc sirf srcDoc/frameWidth/frameHeight mate — recordId mate nahi
  // recordId baharathi aave che so no drift between parent's actionStates and rendered card
  const iframeDoc = buildCollectionRecordIframeDoc(
    record,
    template,
    recordIndex,
  );
  const { srcDoc, frameWidth, frameHeight, collectionName } = iframeDoc;

  // ✅ Map logic andar — parent ne manually populate karvu nathi padtu
  const resolvedCollectionName =
    record?.collection_name ?? record?.collection ?? collectionName;
  const resolvedUrl =
    record?.url ?? record?.link ?? record?.page_url ?? record?.website ?? "";

  recordCollectionMap.current[recordId] = resolvedCollectionName;
  recordUrlMap.current[recordId] = resolvedUrl;

  // ── Numeric frame dimensions ──────────────────────────────────────────────
  const numericFrameWidth =
    typeof frameWidth === "string"
      ? parseFloat(frameWidth)
      : (frameWidth as number);

  const numericFrameHeight =
    typeof frameHeight === "string"
      ? parseFloat(frameHeight)
      : (frameHeight as number);

  // ── Scale calculation for horizontal layout ───────────────────────────────
  // ✅ visibleWidth prop aave to iframe ne scale karo so exactly 2 cards fit thay
  // Backend CSS frameWidth fixed che — transform: scale() vade resize kariye
  const scale =
    layout === "horizontal" &&
    visibleWidth &&
    visibleWidth > 0 &&
    numericFrameWidth > 0
      ? visibleWidth / numericFrameWidth
      : 1;

  // Wrapper width/height after scale
  const cardDisplayWidth =
    layout === "horizontal" && visibleWidth
      ? visibleWidth
      : layout === "vertical"
        ? "100%"
        : numericFrameWidth;

  const cardDisplayHeight =
    scale !== 1 ? numericFrameHeight * scale : numericFrameHeight;

  return (
    <div
      data-record-id={recordId}
      data-collection-name={resolvedCollectionName}
      style={{
        display: "flex",
        flexDirection: "column",
        flexShrink: layout === "horizontal" ? 0 : undefined,
        // ✅ CHANGED: horizontal layout ma visibleWidth use karo (2 cards fit exactly)
        // vertical layout ma 100% width
        width: cardDisplayWidth,
        minWidth: layout === "horizontal" ? cardDisplayWidth : undefined,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ✅ CHANGED: iframe wrapper div — scale transform apply karo */}
      <div
        style={{
          width: cardDisplayWidth,
          height: cardDisplayHeight,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <iframe
          ref={(el) => {
            iframeRefs.current[recordId] = el;
          }}
          title={`Collection record ${recordIndex + 1}`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          style={{
            // ✅ CHANGED: iframe hamesha backend frameWidth/frameHeight par render thay
            // transform: scale() vade visibleWidth ma fit karo — CSS touch nathi karta
            width: numericFrameWidth,
            height: numericFrameHeight,
            display: "block",
            border: "none",
            transformOrigin: "top left",
            transform: scale !== 1 ? `scale(${scale})` : undefined,
          }}
          srcDoc={srcDoc}
        />
      </div>
      <CardActionButtons
        recordId={recordId}
        state={actionState}
        onLikeToggle={onLikeToggle}
        onShareClick={onShareClick}
      />
    </div>
  );
};

export default CollectionRecordCard;