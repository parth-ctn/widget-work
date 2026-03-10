// hooks/useCollectionActionStates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralises ALL collection record action state logic that was duplicated
// between ChatWidget (FeaturedSlider) and ChatCollectionsScreen:
//
//   1. actionStates map  (likeCount / viewCount / shareCount / isLiked)
//   2. postMessage handler  (BV_LIKE_INIT + BV_LIKE_TOGGLE_RESPONSE)
//   3. handleLikeToggle  — optimistic update + postMessage to iframe
//   4. handleShareClick  — optimistic update + increment-views API + open URL
//
// Usage:
//   const { actionStates, setActionStates, handleLikeToggle, handleShareClick }
//     = useCollectionActionStates({ iframeRefs, recordCollectionMap, recordUrlMap });
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { RecordActionState } from "../components/common/Collectioncard";
import { CONNECTOR_BASE_URL } from "../config/constants";

interface UseCollectionActionStatesOptions {
  /** Ref map: recordId → iframe element (for postMessage) */
  iframeRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  /** Ref map: recordId → collectionName (for share API) */
  recordCollectionMap: React.MutableRefObject<Record<string, string>>;
  /** Ref map: recordId → URL (for share redirect) */
  recordUrlMap: React.MutableRefObject<Record<string, string>>;
}

interface UseCollectionActionStatesReturn {
  actionStates: Record<string, RecordActionState>;
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >;
  handleLikeToggle: (recordId: string) => void;
  handleShareClick: (recordId: string) => Promise<void>;
}

export function useCollectionActionStates({
  iframeRefs,
  recordCollectionMap,
  recordUrlMap,
}: UseCollectionActionStatesOptions): UseCollectionActionStatesReturn {
  const [actionStates, setActionStates] = useState<
    Record<string, RecordActionState>
  >({});

  // ── postMessage handler from iframes ──────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, recordId, likeCount, isLiked, success } = event.data ?? {};

      // Iframe sends initial like state after mount
      if (type === "BV_LIKE_INIT" && recordId) {
        setActionStates((prev) => {
          const existing = prev[recordId];
          if (!existing) return prev;
          return {
            ...prev,
            [recordId]: {
              ...existing,
              likeCount: likeCount != null ? likeCount : existing.likeCount,
              isLiked: isLiked != null ? isLiked : existing.isLiked,
            },
          };
        });
      }

      // Iframe responds to our BV_LIKE_TOGGLE_REQUEST
      if (type === "BV_LIKE_TOGGLE_RESPONSE" && recordId) {
        setActionStates((prev) => {
          const current = prev[recordId];
          if (!current) return prev;
          if (success) {
            return { ...prev, [recordId]: { ...current, likeCount, isLiked } };
          }
          // API failed → revert optimistic update
          return {
            ...prev,
            [recordId]: {
              ...current,
              isLiked: !current.isLiked,
              likeCount: !current.isLiked
                ? current.likeCount + 1
                : Math.max(0, current.likeCount - 1),
            },
          };
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Like toggle — optimistic update + postMessage to iframe ───────────────
  const handleLikeToggle = useCallback(
    (recordId: string) => {
      setActionStates((prev) => {
        const current = prev[recordId];
        if (!current) return prev;
        const willBeLiked = !current.isLiked;
        return {
          ...prev,
          [recordId]: {
            ...current,
            isLiked: willBeLiked,
            likeCount: willBeLiked
              ? current.likeCount + 1
              : Math.max(0, current.likeCount - 1),
          },
        };
      });

      const iframe = iframeRefs.current[recordId];
      iframe?.contentWindow?.postMessage(
        { type: "BV_LIKE_TOGGLE_REQUEST", recordId },
        "*",
      );
    },
    [iframeRefs],
  );

  // ── Share click — optimistic +1 + increment-views API + open URL ──────────
  const handleShareClick = useCallback(
    async (recordId: string) => {
      const collectionName = recordCollectionMap.current[recordId] ?? "";
      const recordUrl = recordUrlMap.current[recordId] ?? "";

      // Optimistic update
      setActionStates((prev) => {
        const current = prev[recordId];
        if (!current) return prev;
        return {
          ...prev,
          [recordId]: { ...current, shareCount: current.shareCount + 1 },
        };
      });

      // Fire-and-forget analytics
      try {
        await fetch(
          `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-views`,
          {
            method: "PUT",
            headers: {
              accept: "application/json, text/plain, */*",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              collection_name: collectionName,
              record_id: recordId,
            }),
          },
        );
      } catch (err) {
        console.error("[SHARE] increment-views error:", err);
      }

      if (recordUrl) {
        window.open(recordUrl, "_blank", "noopener,noreferrer");
      }
    },
    [recordCollectionMap, recordUrlMap],
  );

  return { actionStates, setActionStates, handleLikeToggle, handleShareClick };
}
