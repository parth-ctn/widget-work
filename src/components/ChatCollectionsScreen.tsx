// ChatCollectionsScreen.tsx  (REFACTORED)
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   • useCollectionActionStates hook  → replaces inline postMessage handler,
//                                       handleLikeToggle, handleShareClick
//   • useImpressionTracking hook      → replaces inline IntersectionObserver
//                                       + scroll + dwell timer logic (~80 lines)
//   • CollectionPagination            → replaces inline pagination JSX
//   • EmptyState                      → replaces inline state message divs
//   • LoadingSpinner                  → replaces inline loading div
// All business logic (fetch, pagination, search) is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionTemplate } from "../types/index";
import { fetchCollectionRecords, fetchLikesHistory } from "../services/api";
import { buildCollectionRecordIframeDoc } from "../utils/collections";
import {
  CollectionRecordCard,
  type RecordActionState,
} from "./common/Collectioncard";

// ── Common components & hooks ─────────────────────────────────────────────────

import LoadingSpinner from "./common/LoadingSpinner"
import EmptyState from "./common/Emptystate";
import CollectionPagination from "./common/CollectionPagination";
import { useCollectionActionStates } from "../hooks/useCollectionActionstates";
import { useImpressionTracking } from "../hooks/useImpressiontracking";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatCollectionsScreenProps = {
  collectionNames: string[];
  collectionTemplateMap: Map<string, CollectionTemplate>;
  templatesLoading: boolean;
  templatesError: string | null;
  userId?: string;
  sessionId?: string | null;
  searchQuery: string;
  isChatAgent?: boolean;
};

const PAGE_LIMIT = 20;

const getInitialCounts = (rec: any) => {
  const statsAll = rec?.stats?.ALL ?? rec?.stats ?? null;
  return {
    likeCount: rec?.like_count ?? rec?.likes ?? statsAll?.likes ?? 0,
    viewCount:
      rec?.view_count ??
      rec?.views ??
      statsAll?.impressions ??
      statsAll?.views ??
      0,
    shareCount: rec?.share_count ?? rec?.shares ?? statsAll?.shares ?? 0,
  };
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatCollectionsScreen({
  collectionNames,
  collectionTemplateMap,
  templatesLoading,
  templatesError,
  userId,
  sessionId,
  searchQuery,
  isChatAgent = true,
}: ChatCollectionsScreenProps) {
  const [currentCollection, setCurrentCollection] = useState<string | null>(
    collectionNames[0] ?? null,
  );
  const [records, setRecords] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previousPipeline, setPreviousPipeline] = useState<any>(undefined);
  const [previousQuery, setPreviousQuery] = useState<any>(undefined);

  // Refs passed to common hook + card component
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recordCollectionMap = useRef<Record<string, string>>({});
  const recordUrlMap = useRef<Record<string, string>>({});

  // ✅ Common hook: replaces inline postMessage handler + like/share handlers
  const { actionStates, setActionStates, handleLikeToggle, handleShareClick } =
    useCollectionActionStates({
      iframeRefs,
      recordCollectionMap,
      recordUrlMap,
    });

  // ✅ Common hook: replaces inline IntersectionObserver + scroll + dwell logic
  useImpressionTracking({
    mode: "single",
    containerRef: scrollContainerRef,
    records,
    currentCollection,
    setActionStates,
  });

  const totalPages = useMemo(() => {
    if (!totalRecords) return 1;
    return Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
  }, [totalRecords]);

  // ── Sync currentCollection ────────────────────────────────────────────────
  useEffect(() => {
    if (!collectionNames.length) {
      setCurrentCollection(null);
      setRecords([]);
      setTotalRecords(0);
      return;
    }
    setCurrentCollection((prev) => {
      if (prev && collectionNames.includes(prev)) return prev;
      return collectionNames[0];
    });
  }, [collectionNames]);

  // ── Reset page on collection/search change ────────────────────────────────
  useEffect(() => {
    setPage(1);
    setPreviousPipeline(undefined);
    setPreviousQuery(undefined);
  }, [currentCollection, searchQuery]);

  // ── Records + LikesHistory fetch ──────────────────────────────────────────
  useEffect(() => {
    if (templatesLoading || templatesError) return;
    if (!currentCollection || !userId || !sessionId) {
      setRecords([]);
      setTotalRecords(0);
      setActionStates({});
      return;
    }

    const template = collectionTemplateMap.get(currentCollection);
    let cancelled = false;

    const loadRecords = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const trimmedQuery = searchQuery.trim();
      const payload = {
        query: trimmedQuery.length ? trimmedQuery : undefined,
        collection_name: currentCollection,
        user_uuid: userId,
        session_uuid: sessionId,
        llm_provider: "gemini_modality",
        limit: PAGE_LIMIT,
        skip: page > 1 ? (page - 1) * PAGE_LIMIT : 0,
        ...(trimmedQuery.length ? { previousQuery, previousPipeline } : {}),
        isChatAgent,
      };

      try {
        const response = await fetchCollectionRecords(payload);
        if (cancelled) return;

        const data = response?.data ?? {};
        const nextRecords: any[] = Array.isArray(data.records)
          ? Array.isArray(data.records[0])
            ? []
            : data.records
          : [];
        const total =
          Number(
            data.recordsTotal ?? data.records_total ?? nextRecords.length,
          ) || nextRecords.length;

        // Build initialStates using iframeDoc.recordId for exact key match
        const initialStates: Record<string, RecordActionState> = {};
        const rawIdToRecordId: Record<string, string> = {};
        const rawRecordIds: string[] = [];

        nextRecords.forEach((rec: any, index: number) => {
          const rawId = rec?._id ?? rec?.id ?? "";
          if (!rawId) return;

          let recordId = rawId;
          if (template?.html) {
            const iframeDoc = buildCollectionRecordIframeDoc(
              rec,
              template,
              index,
            );
            recordId = iframeDoc.recordId;
          }

          rawIdToRecordId[rawId] = recordId;
          rawRecordIds.push(rawId);

          const { likeCount, viewCount, shareCount } = getInitialCounts(rec);
          initialStates[recordId] = {
            likeCount,
            viewCount,
            shareCount,
            isLiked: false,
          };
        });

        // Visitor id resolve
        let visitorId = "";
        try {
          visitorId = localStorage.getItem("bv_visitor_id") ?? "";
          if (!visitorId) {
            visitorId =
              "v_" +
              Math.random().toString(36).slice(2) +
              Date.now().toString(36);
            localStorage.setItem("bv_visitor_id", visitorId);
          }
        } catch {
          /* ignore */
        }

        const resolvedUserId = userId || visitorId;
        const isVisitor = !userId;

        // fetchLikesHistory
        const likesRes = rawRecordIds.length
          ? await fetchLikesHistory({
              collection_name: currentCollection,
              records: rawRecordIds,
              id: resolvedUserId,
              is_visitor: isVisitor,
            }).catch((err) => {
              console.error("[LIKES_HISTORY]", err);
              return null;
            })
          : null;

        if (cancelled) return;

        // Merge likes history
        const mergedStates = { ...initialStates };
        const likesData = likesRes?.data;
        if (likesData) {
          Object.entries(likesData).forEach(([rawId, info]: [string, any]) => {
            const recordId = rawIdToRecordId[rawId] ?? rawId;
            if (!mergedStates[recordId]) return;
            const serverImpressions =
              info.stats?.impressions ??
              info.stats?.ALL?.impressions ??
              info.stats?.GLOBAL?.impressions ??
              null;
            mergedStates[recordId] = {
              ...mergedStates[recordId],
              likeCount: info.stats?.likes ?? mergedStates[recordId].likeCount,
              isLiked: info.liked ?? mergedStates[recordId].isLiked,
              viewCount:
                serverImpressions !== null
                  ? serverImpressions
                  : mergedStates[recordId].viewCount,
              shareCount:
                info.stats?.views != null
                  ? info.stats.views
                  : mergedStates[recordId].shareCount,
            };
          });
        }

        setRecords(nextRecords);
        setTotalRecords(total);
        setActionStates(mergedStates);
        setPreviousPipeline(data.previousPipeline);
        setPreviousQuery(data.previousQuery);
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading records:", error);
          setErrorMessage("Failed to load collection records.");
          setRecords([]);
          setTotalRecords(0);
          setActionStates({});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [
    currentCollection,
    userId,
    sessionId,
    page,
    searchQuery,
    isChatAgent,
    templatesLoading,
    templatesError,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early returns ─────────────────────────────────────────────────────────

  if (templatesLoading)
    return (
      <div className="chat-collection-screen">
        {/* ✅ Common: EmptyState */}
        <EmptyState message="Loading collection templates..." />
      </div>
    );

  if (templatesError)
    return (
      <div className="chat-collection-screen">
        <EmptyState message={templatesError} variant="error" />
      </div>
    );

  if (!collectionNames.length)
    return (
      <div className="chat-collection-screen">
        <EmptyState message="No collections found." />
      </div>
    );

  if (!userId || !sessionId)
    return (
      <div className="chat-collection-screen">
        <EmptyState message="Start a chat to load collection records." />
      </div>
    );

  const template = currentCollection
    ? collectionTemplateMap.get(currentCollection)
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="chat-collection-screen">
      <div className="collection-screen-header">
        <h3 className="collection-screen-title">Collections</h3>
      </div>

      <div className="collection-tab-list">
        {collectionNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`collection-tab ${name === currentCollection ? "active" : ""}`}
            onClick={() => setCurrentCollection(name)}
            title={name}
          >
            {name}
          </button>
        ))}
      </div>

      {isLoading ? (
        // ✅ Common: LoadingSpinner
        <LoadingSpinner label="Loading records..." />
      ) : errorMessage ? (
        <EmptyState message={errorMessage} variant="error" />
      ) : !template ? (
        <EmptyState message="Collection template unavailable." />
      ) : records.length === 0 ? (
        <EmptyState message="No records found." />
      ) : (
        <div className="collection-screen-body">
          <div className="collection-records" ref={scrollContainerRef}>
            {records.map((record, index) => {
              const iframeDoc = buildCollectionRecordIframeDoc(
                record,
                template,
                index,
              );
              const recordId = iframeDoc.recordId;
              const actionState = actionStates[recordId] ?? {
                likeCount: iframeDoc.initialLikeCount,
                viewCount: iframeDoc.initialViewCount,
                shareCount: iframeDoc.initialShareCount,
                isLiked: false,
              };
              return (
                <CollectionRecordCard
                  key={`${currentCollection}-${index}`}
                  record={record}
                  template={template}
                  recordIndex={index}
                  recordId={recordId}
                  actionState={actionState}
                  layout="vertical"
                  iframeRefs={iframeRefs}
                  recordCollectionMap={recordCollectionMap}
                  recordUrlMap={recordUrlMap}
                  onLikeToggle={handleLikeToggle}
                  onShareClick={handleShareClick}
                />
              );
            })}
          </div>

          {/* ✅ Common: CollectionPagination */}
          <CollectionPagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </div>
  );
}
