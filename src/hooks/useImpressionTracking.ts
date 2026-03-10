// hooks/useImpressionTracking.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralises the IntersectionObserver + scroll + dwell-timer impression
// tracking logic that was **copy-pasted** between:
//   • ChatWidget  (featuredCollections impression tracking)
//   • ChatCollectionsScreen  (records impression tracking)
//
// Strategy:
//   - Observes all [data-record-id] elements inside each registered container
//   - Card must be visible for ≥1 second before counting as an impression
//   - Fires a batched PUT to increment-impressions-v2
//   - Each record fires at most once per hook invocation (firedRef per render)
//   - viewCount in actionStates is incremented optimistically after success
//
// Usage (single container — ChatCollectionsScreen):
//   useImpressionTracking({
//     containerRef: scrollContainerRef,
//     records,
//     currentCollection,
//     setActionStates,
//   });
//
// Usage (multi-container — ChatWidget featured slider):
//   useImpressionTracking({
//     containerRefs: featuredScrollContainerRefs,      // Record<name, el>
//     collections: featuredCollections,                // [{ collectionName, records }]
//     trackingKey: featuredRecordIds + homeImpressionKey,
//     setActionStates: setFeaturedActionStates,
//   });
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import type { RecordActionState } from "../components/common/Collectioncard";
import { CONNECTOR_BASE_URL } from "../config/constants";

// ── Visibility helper (used by multi-container mode) ──────────────────────────
const isCardVisibleInContainer = (
  el: HTMLElement,
  container: HTMLElement,
): boolean => {
  const cardRect = el.getBoundingClientRect();
  const contRect = container.getBoundingClientRect();
  const hOverlap =
    Math.min(cardRect.right, contRect.right) -
    Math.max(cardRect.left, contRect.left);
  const hRatio = hOverlap / cardRect.width;
  const vOverlap =
    Math.min(cardRect.bottom, window.innerHeight) - Math.max(cardRect.top, 0);
  const vRatio = vOverlap / cardRect.height;
  return hRatio >= 0.5 && vRatio >= 0.5;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mode A: single scrollable container  (ChatCollectionsScreen)
// ─────────────────────────────────────────────────────────────────────────────

interface SingleContainerOptions {
  mode?: "single";
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Array of records currently visible (changes trigger re-setup) */
  records: any[];
  /** Current collection name (used as collection_name in the API) */
  currentCollection: string | null;
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode B: multiple named containers  (ChatWidget featured slider)
// ─────────────────────────────────────────────────────────────────────────────

interface FeaturedCollection {
  collectionName: string;
  records: any[];
}

interface MultiContainerOptions {
  mode: "multi";
  /** Map of collectionName → scroll container element */
  containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  collections: FeaturedCollection[];
  /** Any string/number that changes when you want a fresh firedRef (e.g. `${recordIds}-${impressionKey}`) */
  trackingKey: string | number;
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >;
}

type UseImpressionTrackingOptions =
  | SingleContainerOptions
  | MultiContainerOptions;

// ── Shared batch fire logic ───────────────────────────────────────────────────
async function fireBatch(
  readyToBatch: Map<string, string>,
  firedSet: Set<string>,
  setActionStates: React.Dispatch<
    React.SetStateAction<Record<string, RecordActionState>>
  >,
) {
  if (!readyToBatch.size) return;
  const batch = Array.from(readyToBatch.entries()).map(
    ([id, collection_name]) => ({ _id: id, collection_name }),
  );
  readyToBatch.clear();
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
    console.error("[IMPRESSION] Batch error:", err);
    batch.forEach(({ _id }) => firedSet.delete(_id));
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useImpressionTracking(opts: UseImpressionTrackingOptions) {
  const { setActionStates } = opts;

  useEffect(() => {
    // ── MODE A: single container ─────────────────────────────────────────────
    if (!opts.mode || opts.mode === "single") {
      const { containerRef, records, currentCollection } =
        opts as SingleContainerOptions;
      if (!records.length || !currentCollection) return;

      const container = containerRef.current;
      if (!container) return;

      const firedSet = new Set<string>();
      const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
      const readyToBatch = new Map<string, string>();
      let batchTimer: ReturnType<typeof setTimeout> | null = null;

      const scheduleBatch = () => {
        if (batchTimer) clearTimeout(batchTimer);
        batchTimer = setTimeout(
          () => void fireBatch(readyToBatch, firedSet, setActionStates),
          200,
        );
      };

      const startDwell = (id: string, coll: string, el: HTMLElement) => {
        if (dwellTimers.has(id)) return;
        const t = setTimeout(() => {
          dwellTimers.delete(id);
          if (firedSet.has(id)) return;
          if (isCardVisibleInContainer(el, container)) {
            firedSet.add(id);
            readyToBatch.set(id, coll);
            scheduleBatch();
          }
        }, 1000);
        dwellTimers.set(id, t);
      };

      const cancelDwell = (id: string) => {
        if (dwellTimers.has(id)) {
          clearTimeout(dwellTimers.get(id)!);
          dwellTimers.delete(id);
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement;
            const id = el.dataset.recordId!;
            const coll = el.dataset.collectionName!;
            if (!id || !coll || firedSet.has(id)) return;
            if (
              entry.isIntersecting &&
              isCardVisibleInContainer(el, container)
            ) {
              startDwell(id, coll, el);
            } else {
              cancelDwell(id);
            }
          });
        },
        { root: null, threshold: 0.5 },
      );

      const onScroll = () => {
        container
          .querySelectorAll<HTMLElement>("[data-record-id]")
          .forEach((el) => {
            const id = el.dataset.recordId!;
            const coll = el.dataset.collectionName!;
            if (!id || !coll || firedSet.has(id)) return;
            if (isCardVisibleInContainer(el, container))
              startDwell(id, coll, el);
            else cancelDwell(id);
          });
      };

      container
        .querySelectorAll<HTMLElement>("[data-record-id]")
        .forEach((el) => observer.observe(el));
      container.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      return () => {
        observer.disconnect();
        container.removeEventListener("scroll", onScroll);
        dwellTimers.forEach((t) => clearTimeout(t));
        dwellTimers.clear();
        if (batchTimer) clearTimeout(batchTimer);
      };
    }

    // ── MODE B: multi container (featured slider) ────────────────────────────
    const { containerRefs, collections } = opts as MultiContainerOptions;

    const hasRecords = collections.some((fc) => fc.records.length > 0);
    if (!hasRecords) return;

    const firedSet = new Set<string>();
    const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const readyToBatch = new Map<string, string>();
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleBatch = () => {
      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(
        () => void fireBatch(readyToBatch, firedSet, setActionStates),
        200,
      );
    };

    const startDwell = (id: string, coll: string, el: HTMLElement) => {
      if (dwellTimers.has(id) || firedSet.has(id)) return;
      const t = setTimeout(() => {
        dwellTimers.delete(id);
        if (firedSet.has(id)) return;
        const rect = el.getBoundingClientRect();
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight;
        if (isVisible) {
          firedSet.add(id);
          readyToBatch.set(id, coll);
          scheduleBatch();
        }
      }, 1000);
      dwellTimers.set(id, t);
    };

    const cancelDwell = (id: string) => {
      if (dwellTimers.has(id)) {
        clearTimeout(dwellTimers.get(id)!);
        dwellTimers.delete(id);
      }
    };

    const observers: IntersectionObserver[] = [];
    const scrollListeners: Array<{ el: HTMLElement; fn: () => void }> = [];

    collections.forEach((fc) => {
      if (!fc.records.length) return;

      const setupForContainer = (container: HTMLDivElement) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const el = entry.target as HTMLElement;
              const id = el.dataset.recordId!;
              const coll = el.dataset.collectionName!;
              if (!id || !coll || firedSet.has(id)) return;
              if (entry.isIntersecting) startDwell(id, coll, el);
              else cancelDwell(id);
            });
          },
          { root: null, threshold: 0.1 },
        );

        const onScroll = () => {
          container
            .querySelectorAll<HTMLElement>("[data-record-id]")
            .forEach((el) => {
              const id = el.dataset.recordId!;
              const coll = el.dataset.collectionName!;
              if (!id || !coll || firedSet.has(id)) return;
              const rect = el.getBoundingClientRect();
              const isVisible =
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight;
              if (isVisible) startDwell(id, coll, el);
              else cancelDwell(id);
            });
        };

        container
          .querySelectorAll<HTMLElement>("[data-record-id]")
          .forEach((el) => observer.observe(el));
        container.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        observers.push(observer);
        scrollListeners.push({ el: container, fn: onScroll });
      };

      const container = containerRefs.current[fc.collectionName];
      if (container) {
        setupForContainer(container);
      } else {
        setTimeout(() => {
          const c = containerRefs.current[fc.collectionName];
          if (c) setupForContainer(c);
        }, 300);
      }
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      scrollListeners.forEach(({ el, fn }) =>
        el.removeEventListener("scroll", fn),
      );
      dwellTimers.forEach((t) => clearTimeout(t));
      dwellTimers.clear();
      if (batchTimer) clearTimeout(batchTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.mode === "multi"
      ? (opts as MultiContainerOptions).trackingKey
      : // single mode deps
        [
          (opts as SingleContainerOptions).records,
          (opts as SingleContainerOptions).currentCollection,
        ],
  ]);
}
