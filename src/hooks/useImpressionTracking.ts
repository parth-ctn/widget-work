// hooks/useImpressionTracking.ts  ── v3
// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE OF CONTINUOUS FIRING:
//   getCardEls() always returned [] because CollectionRecordCard wrapper div
//   does NOT have data-record-id on it in the React DOM — that attribute only
//   exists inside the srcdoc iframe (cross-document, invisible to querySelectorAll).
//   So IntersectionObserver observed nothing, firedSet stayed empty forever,
//   and the effect re-ran on every render → infinite API calls.
//
// FIX STRATEGY (v3):
//   Do NOT depend on DOM attributes at all.
//   Instead: use IntersectionObserver on the card WRAPPER elements directly
//   by index — we get them via the container's direct children.
//   Map index → recordId using the records array passed in as prop.
//   firedSet uses recordId as key → fires exactly once per record per mount.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { RecordActionState } from "../components/common/Collectioncard";
import { CONNECTOR_BASE_URL } from "../config/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SingleContainerOptions {
  mode?: "single";
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  records: any[];
  currentCollection: string | null;
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >;
}

interface FeaturedCollection {
  collectionName: string;
  records: any[];
}

interface MultiContainerOptions {
  mode: "multi";
  containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  collections: FeaturedCollection[];
  trackingKey: string | number;
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >;
}

type UseImpressionTrackingOptions =
  | SingleContainerOptions
  | MultiContainerOptions;

// ─── Batch fire ───────────────────────────────────────────────────────────────

async function fireBatch(
  batch: Array<{ _id: string; collection_name: string }>,
  firedSet: Set<string>,
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >,
) {
  if (!batch.length) return;
  try {
    const res = await fetch(
      `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-impressions-v2`,
      {
        method: "PUT",
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
        },
        body: JSON.stringify({ record: batch }),
      },
    );
    if (!res.ok) {
      // roll back firedSet so they can retry
      batch.forEach(({ _id }) => firedSet.delete(_id));
      return;
    }
    setActionStates((prev) => {
      const updated = { ...prev };
      batch.forEach(({ _id }) => {
        if (!updated[_id]) return;
        updated[_id] = {
          ...updated[_id],
          viewCount: updated[_id].viewCount + 1,
        };
      });
      return updated;
    });
  } catch (err) {
    console.error("[IMPRESSION] fireBatch error:", err);
    batch.forEach(({ _id }) => firedSet.delete(_id));
  }
}

// ─── Core: observe a container's direct children by index ─────────────────────
// recordIdByIndex: Map<childIndex, { recordId, collectionName }>
// Each child element = one CollectionRecordCard wrapper div (rendered in order)

function setupObserver(
  container: HTMLElement,
  recordIdByIndex: Map<number, { id: string; coll: string }>,
  firedSet: Set<string>,
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >,
): () => void {
  const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const readyToBatch = new Map<string, string>();
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleBatch = () => {
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      if (!readyToBatch.size) return;
      const batch = Array.from(readyToBatch.entries()).map(([id, coll]) => ({
        _id: id,
        collection_name: coll,
      }));
      readyToBatch.clear();
      void fireBatch(batch, firedSet, setActionStates);
    }, 300);
  };

  const startDwell = (id: string, coll: string) => {
    if (dwellTimers.has(id) || firedSet.has(id)) return;
    const t = setTimeout(() => {
      dwellTimers.delete(id);
      if (firedSet.has(id)) return;
      firedSet.add(id);
      readyToBatch.set(id, coll);
      scheduleBatch();
    }, 1000);
    dwellTimers.set(id, t);
  };

  const cancelDwell = (id: string) => {
    const t = dwellTimers.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      dwellTimers.delete(id);
    }
  };

  // Observe direct children (each = one card wrapper rendered by React)
  const children = Array.from(container.children) as HTMLElement[];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        // Find which child index this is
        const idx = children.indexOf(el);
        const rec = recordIdByIndex.get(idx);
        if (!rec) return;
        if (firedSet.has(rec.id)) return;

        if (entry.isIntersecting) {
          startDwell(rec.id, rec.coll);
        } else {
          cancelDwell(rec.id);
        }
      });
    },
    { root: null, threshold: 0.5 },
  );

  children.forEach((el) => observer.observe(el));

  const cleanup = () => {
    observer.disconnect();
    dwellTimers.forEach((t) => clearTimeout(t));
    dwellTimers.clear();
    if (batchTimer) clearTimeout(batchTimer);
  };

  return cleanup;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImpressionTracking(opts: UseImpressionTrackingOptions) {
  const { setActionStates } = opts;

  // firedSet lives across renders — use ref so it's NOT reset on re-render
  // Only reset when trackingKey / records+collection changes
  const firedSetRef = useRef(new Set<string>());

  useEffect(() => {
    // Reset fired set on new page/collection/key
    firedSetRef.current = new Set<string>();

    // ── MODE A: single (ChatCollectionsScreen) ───────────────────────────────
    if (!opts.mode || opts.mode === "single") {
      const { containerRef, records, currentCollection } =
        opts as SingleContainerOptions;

      if (!records.length || !currentCollection) return;

      const container = containerRef.current;
      if (!container) return;

      // Build index → { id, coll } map from records array
      // recordId = rec._id ?? rec.id  (same as buildCollectionRecordIframeDoc)
      const recordIdByIndex = new Map<number, { id: string; coll: string }>();
      records.forEach((rec, idx) => {
        const id = rec?._id ?? rec?.id ?? "";
        if (!id) return;
        recordIdByIndex.set(idx, {
          id,
          coll: rec?.collection_name ?? rec?.collection ?? currentCollection,
        });
      });

      // Wait one tick for React to finish rendering children
      let cleanup: (() => void) | null = null;
      const setupTimer = setTimeout(() => {
        cleanup = setupObserver(
          container,
          recordIdByIndex,
          firedSetRef.current,
          setActionStates,
        );
      }, 50);

      return () => {
        clearTimeout(setupTimer);
        cleanup?.();
      };
    }

    // ── MODE B: multi (ChatWidget featured slider) ───────────────────────────
    const { containerRefs, collections } = opts as MultiContainerOptions;
    if (!collections.some((fc) => fc.records.length > 0)) return;

    const cleanups: Array<() => void> = [];

    collections.forEach((fc) => {
      if (!fc.records.length) return;

      const recordIdByIndex = new Map<number, { id: string; coll: string }>();
      fc.records.forEach((rec, idx) => {
        const id = rec?._id ?? rec?.id ?? "";
        if (!id) return;
        recordIdByIndex.set(idx, {
          id,
          coll: rec?.collection_name ?? rec?.collection ?? fc.collectionName,
        });
      });

      const doSetup = (container: HTMLDivElement) => {
        const cleanup = setupObserver(
          container,
          recordIdByIndex,
          firedSetRef.current,
          setActionStates,
        );
        cleanups.push(cleanup);
      };

      const container = containerRefs.current[fc.collectionName];
      if (container) {
        setTimeout(() => doSetup(container), 50);
      } else {
        // Container not mounted yet — retry
        const retryTimer = setTimeout(() => {
          const c = containerRefs.current[fc.collectionName];
          if (c) doSetup(c);
        }, 400);
        cleanups.push(() => clearTimeout(retryTimer));
      }
    });

    return () => cleanups.forEach((fn) => fn());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.mode === "multi"
      ? (opts as MultiContainerOptions).trackingKey
      : `${(opts as SingleContainerOptions).currentCollection}-${(opts as SingleContainerOptions).records.length}`,
  ]);
}
