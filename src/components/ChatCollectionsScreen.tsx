// //chat collection file
// // ✅ FIXED: stats.impressions → viewCount on refresh (increment-impressions-v2 updates this field)

// import { useEffect, useMemo, useRef, useState } from "react";
// import type { CollectionTemplate } from "../types/index";
// import { fetchCollectionRecords, fetchLikesHistory } from "../services/api";
// import { buildCollectionRecordIframeDoc } from "../utils/collections";
// import { CONNECTOR_BASE_URL } from "../config/constants";

// type ChatCollectionsScreenProps = {
//   collectionNames: string[];
//   collectionTemplateMap: Map<string, CollectionTemplate>;
//   templatesLoading: boolean;
//   templatesError: string | null;
//   userId?: string;
//   sessionId?: string | null;
//   searchQuery: string;
//   isChatAgent?: boolean;
// };

// const PAGE_LIMIT = 20;

// const HeartIcon = ({ filled }: { filled: boolean }) => (
//   <svg
//     width="14"
//     height="14"
//     viewBox="0 0 24 24"
//     fill={filled ? "#e53535" : "none"}
//     stroke={filled ? "#e53535" : "#333"}
//     strokeWidth="2.2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     style={{ pointerEvents: "none" }}
//   >
//     <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
//   </svg>
// );

// const EyeIcon = () => (
//   <svg
//     width="14"
//     height="14"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="#333"
//     strokeWidth="2.2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     style={{ pointerEvents: "none" }}
//   >
//     <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//     <circle cx="12" cy="12" r="3" />
//   </svg>
// );

// const ShareIcon = () => (
//   <svg
//     width="14"
//     height="14"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="#333"
//     strokeWidth="2.2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     style={{ pointerEvents: "none" }}
//   >
//     <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
//     <polyline points="15 3 21 3 21 9" />
//     <line x1="10" y1="14" x2="21" y2="3" />
//   </svg>
// );

// type RecordActionState = {
//   likeCount: number;
//   viewCount: number;
//   shareCount: number;
//   isLiked: boolean;
// };

// const getSessionCount = (id: string): number | null => {
//   // Not used to block impressions — every page load fires fresh impression
//   return null;
// };

// const setSessionCount = (_id: string, _count: number): void => {
//   // No-op — refresh = new impression, server is source of truth
// };

// const getInitialCounts = (rec: any) => {
//   const statsAll = rec?.stats?.ALL ?? rec?.stats ?? null;
//   return {
//     likeCount: rec?.like_count ?? rec?.likes ?? statsAll?.likes ?? 0,
//     // ✅ impressions = increment-impressions-v2 API je field update kare che
//     viewCount:
//       rec?.view_count ??
//       rec?.views ??
//       statsAll?.impressions ??
//       statsAll?.views ??
//       0,
//     shareCount: rec?.share_count ?? rec?.shares ?? statsAll?.shares ?? 0,
//   };
// };

// const isCardVisibleInContainer = (
//   el: HTMLElement,
//   container: HTMLElement,
// ): boolean => {
//   const cardRect = el.getBoundingClientRect();
//   const contRect = container.getBoundingClientRect();
//   const hOverlap =
//     Math.min(cardRect.right, contRect.right) -
//     Math.max(cardRect.left, contRect.left);
//   const hRatio = hOverlap / cardRect.width;
//   const vOverlap =
//     Math.min(cardRect.bottom, window.innerHeight) - Math.max(cardRect.top, 0);
//   const vRatio = vOverlap / cardRect.height;
//   return hRatio >= 0.5 && vRatio >= 0.5;
// };

// const CardActionButtons = ({
//   recordId,
//   state,
//   collectionName,
//   onLikeToggle,
//   onShareClick,
// }: {
//   recordId: string;
//   state: RecordActionState;
//   collectionName: string;
//   onLikeToggle: (recordId: string) => void;
//   onShareClick: (recordId: string) => void;
// }) => (
//   <div
//     style={{
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "space-between",
//       width: "100%",
//       boxSizing: "border-box",
//       padding: "4px 1px 2px 1px",
//     }}
//   >
//     <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
//       <button
//         type="button"
//         onClick={() => onLikeToggle(recordId)}
//         style={{
//           display: "inline-flex",
//           alignItems: "center",
//           gap: "4px",
//           background: state.isLiked ? "#fff0f0" : "#fff",
//           border: `1px solid ${state.isLiked ? "#f87171" : "#d0d0d0"}`,
//           borderRadius: "5px",
//           padding: "4px 10px",
//           cursor: "pointer",
//           fontSize: "9px",
//           fontWeight: 500,
//           color: state.isLiked ? "#e53535" : "#222",
//           fontFamily: "Arial, sans-serif",
//           flexShrink: 0,
//           lineHeight: 1,
//           whiteSpace: "nowrap",
//           transition: "background 0.15s, border-color 0.15s, color 0.15s",
//         }}
//       >
//         <HeartIcon filled={state.isLiked} />
//         <span>{state.likeCount}</span>
//       </button>
//       <button
//         type="button"
//         style={{
//           display: "inline-flex",
//           alignItems: "center",
//           gap: "4px",
//           background: "#fff",
//           border: "1px solid #d0d0d0",
//           borderRadius: "5px",
//           padding: "4px 10px",
//           cursor: "default",
//           fontSize: "9px",
//           fontWeight: 500,
//           color: "#222",
//           fontFamily: "Arial, sans-serif",
//           flexShrink: 0,
//           lineHeight: 1,
//           whiteSpace: "nowrap",
//         }}
//       >
//         <EyeIcon />
//         <span>{state.viewCount}</span>
//       </button>
//     </div>

//     <button
//       type="button"
//       onClick={() => onShareClick(recordId)}
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         gap: "4px",
//         background: "#fff",
//         border: "1px solid #d0d0d0",
//         borderRadius: "5px",
//         padding: "4px 10px",
//         cursor: "pointer",
//         fontSize: "9px",
//         fontWeight: 500,
//         color: "#222",
//         fontFamily: "Arial, sans-serif",
//         flexShrink: 0,
//         lineHeight: 1,
//         whiteSpace: "nowrap",
//       }}
//     >
//       <ShareIcon />
//       <span>{state.shareCount}</span>
//     </button>
//   </div>
// );

// export default function ChatCollectionsScreen({
//   collectionNames,
//   collectionTemplateMap,
//   templatesLoading,
//   templatesError,
//   userId,
//   sessionId,
//   searchQuery,
//   isChatAgent = true,
// }: ChatCollectionsScreenProps) {
//   const [currentCollection, setCurrentCollection] = useState<string | null>(
//     collectionNames[0] ?? null,
//   );
//   const [records, setRecords] = useState<any[]>([]);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const [page, setPage] = useState(1);
//   const [isLoading, setIsLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [previousPipeline, setPreviousPipeline] = useState<any>(undefined);
//   const [previousQuery, setPreviousQuery] = useState<any>(undefined);
//   const [actionStates, setActionStates] = useState<
//     Record<string, RecordActionState>
//   >({});

//   const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
//   const scrollContainerRef = useRef<HTMLDivElement | null>(null);
//   const firedRef = useRef<Set<string>>(new Set());
//   const recordCollectionMap = useRef<Record<string, string>>({});
//   const recordUrlMap = useRef<Record<string, string>>({});

//   const totalPages = useMemo(() => {
//     if (!totalRecords) return 1;
//     return Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
//   }, [totalRecords]);

//   // ── Like + Toggle postMessage handler ────────────────────────────────────
//   useEffect(() => {
//     const handleMessage = (event: MessageEvent) => {
//       const { type, recordId, likeCount, isLiked, success } = event.data ?? {};

//       if (type === "BV_LIKE_INIT" && recordId) {
//         setActionStates((prev) => {
//           const existing = prev[recordId];
//           if (!existing) return prev;
//           return {
//             ...prev,
//             [recordId]: {
//               ...existing,
//               likeCount: likeCount != null ? likeCount : existing.likeCount,
//               isLiked: isLiked != null ? isLiked : existing.isLiked,
//             },
//           };
//         });
//       }

//       if (type === "BV_LIKE_TOGGLE_RESPONSE" && recordId) {
//         setActionStates((prev) => {
//           const current = prev[recordId];
//           if (!current) return prev;
//           if (success) {
//             return { ...prev, [recordId]: { ...current, likeCount, isLiked } };
//           }
//           return {
//             ...prev,
//             [recordId]: {
//               ...current,
//               isLiked: !current.isLiked,
//               likeCount: !current.isLiked
//                 ? current.likeCount + 1
//                 : Math.max(0, current.likeCount - 1),
//             },
//           };
//         });
//       }
//     };
//     window.addEventListener("message", handleMessage);
//     return () => window.removeEventListener("message", handleMessage);
//   }, []);

//   // ── Impression — visible cards only, batch API, once per card per page ───
//   useEffect(() => {
//     if (!records.length || !currentCollection) return;

//     firedRef.current = new Set();
//     const container = scrollContainerRef.current;
//     if (!container) return;

//     const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
//     const readyToBatch = new Map<string, string>();
//     let batchTimer: ReturnType<typeof setTimeout> | null = null;
ma
//     const fireBatch = async () => {
//       if (!readyToBatch.size) return;
//       const batch = Array.from(readyToBatch.entries()).map(
//         ([id, collection_name]) => ({ _id: id, collection_name }),
//       );
//       readyToBatch.clear();
//       try {
//         const res = await fetch(
//           `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-impressions-v2`,
//           {
//             method: "PUT",
//             headers: {
//               accept: "application/json, text/plain, */*",
//               "content-type": "application/json",
//             },
//             body: JSON.stringify({ record: batch }),
//           },
//         );
//         if (!res.ok) {
//           batch.forEach(({ _id }) => firedRef.current.delete(_id));
//           return;
//         }
//         setActionStates((prev) => {
//           const updated = { ...prev };
//           batch.forEach(({ _id }) => {
//             if (!updated[_id]) return;
//             updated[_id] = {
//               ...updated[_id],
//               viewCount: updated[_id].viewCount + 1,
//             };
//           });
//           return updated;
//         });
//       } catch (err) {
//         console.error("[IMP] Batch error:", err);
//         batch.forEach(({ _id }) => firedRef.current.delete(_id));
//       }
//     };

//     const scheduleBatch = () => {
//       if (batchTimer) clearTimeout(batchTimer);
//       batchTimer = setTimeout(fireBatch, 200);
//     };

//     const startDwell = (id: string, coll: string, el: HTMLElement) => {
//       if (dwellTimers.has(id)) return;
//       const t = setTimeout(() => {
//         dwellTimers.delete(id);
//         if (firedRef.current.has(id)) return;
//         if (isCardVisibleInContainer(el, container)) {
//           firedRef.current.add(id);
//           readyToBatch.set(id, coll);
//           scheduleBatch();
//         }
//       }, 1000);
//       dwellTimers.set(id, t);
//     };

//     const cancelDwell = (id: string) => {
//       if (dwellTimers.has(id)) {
//         clearTimeout(dwellTimers.get(id)!);
//         dwellTimers.delete(id);
//       }
//     };

//     const observer = new IntersectionObserver(
//       (entries) => {
//         entries.forEach((entry) => {
//           const el = entry.target as HTMLElement;
//           const id = el.dataset.recordId!;
//           const coll = el.dataset.collectionName!;
//           if (!id || !coll || firedRef.current.has(id)) return;
//           if (entry.isIntersecting && isCardVisibleInContainer(el, container)) {
//             startDwell(id, coll, el);
//           } else {
//             cancelDwell(id);
//           }
//         });
//       },
//       { root: null, threshold: 0.5 },
//     );

//     const onHorizontalScroll = () => {
//       container
//         .querySelectorAll<HTMLElement>("[data-record-id]")
//         .forEach((el) => {
//           const id = el.dataset.recordId!;
//           const coll = el.dataset.collectionName!;
//           if (!id || !coll || firedRef.current.has(id)) return;
//           if (isCardVisibleInContainer(el, container)) {
//             startDwell(id, coll, el);
//           } else {
//             cancelDwell(id);
//           }
//         });
//     };

//     container
//       .querySelectorAll<HTMLElement>("[data-record-id]")
//       .forEach((el) => observer.observe(el));
//     container.addEventListener("scroll", onHorizontalScroll, { passive: true });
//     onHorizontalScroll();

//     return () => {
//       observer.disconnect();
//       container.removeEventListener("scroll", onHorizontalScroll);
//       dwellTimers.forEach((t) => clearTimeout(t));
//       dwellTimers.clear();
//       if (batchTimer) clearTimeout(batchTimer);
//     };
//   }, [records, currentCollection]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Like toggle ───────────────────────────────────────────────────────────
//   const handleLikeToggle = (recordId: string) => {
//     setActionStates((prev) => {
//       const current = prev[recordId];
//       if (!current) return prev;
//       const willBeLiked = !current.isLiked;
//       return {
//         ...prev,
//         [recordId]: {
//           ...current,
//           isLiked: willBeLiked,
//           likeCount: willBeLiked
//             ? current.likeCount + 1
//             : Math.max(0, current.likeCount - 1),
//         },
//       };
//     });

//     const iframe = iframeRefs.current[recordId];
//     iframe?.contentWindow?.postMessage(
//       { type: "BV_LIKE_TOGGLE_REQUEST", recordId },
//       "*",
//     );
//   };

//   // ── Share click → increment-views API + optimistic +1 + redirect ──────────
//   const handleShareClick = async (recordId: string) => {
//     const collectionName =
//       recordCollectionMap.current[recordId] ?? currentCollection ?? "";
//     const recordUrl = recordUrlMap.current[recordId] ?? "";

//     setActionStates((prev) => {
//       const current = prev[recordId];
//       if (!current) return prev;
//       return {
//         ...prev,
//         [recordId]: { ...current, shareCount: current.shareCount + 1 },
//       };
//     });

//     try {
//       await fetch(
//         `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-views`,
//         {
//           method: "PUT",
//           headers: {
//             accept: "application/json, text/plain, */*",
//             "content-type": "application/json",
//           },
//           body: JSON.stringify({
//             collection_name: collectionName,
//             record_id: recordId,
//           }),
//         },
//       );
//     } catch (err) {
//       console.error("[SHARE] increment-views error:", err);
//     }

//     if (recordUrl) {
//       window.open(recordUrl, "_blank", "noopener,noreferrer");
//     }
//   };

//   useEffect(() => {
//     if (!collectionNames.length) {
//       setCurrentCollection(null);
//       setRecords([]);
//       setTotalRecords(0);
//       return;
//     }
//     setCurrentCollection((prev) => {
//       if (prev && collectionNames.includes(prev)) return prev;
//       return collectionNames[0];
//     });
//   }, [collectionNames]);

//   useEffect(() => {
//     setPage(1);
//     setPreviousPipeline(undefined);
//     setPreviousQuery(undefined);
//   }, [currentCollection, searchQuery]);

//   // ── ✅ FIXED: Records + LikesHistory fetch with stats.impressions → viewCount ──
//   useEffect(() => {
//     if (templatesLoading || templatesError) return;
//     if (!currentCollection || !userId || !sessionId) {
//       setRecords([]);
//       setTotalRecords(0);
//       setActionStates({});
//       return;
//     }

//     let cancelled = false;

//     const loadRecords = async () => {
//       setIsLoading(true);
//       setErrorMessage(null);

//       const trimmedQuery = searchQuery.trim();
//       const payload = {
//         query: trimmedQuery.length ? trimmedQuery : undefined,
//         collection_name: currentCollection,
//         user_uuid: userId,
//         session_uuid: sessionId,
//         llm_provider: "gemini_modality",
//         limit: PAGE_LIMIT,
//         skip: page > 1 ? (page - 1) * PAGE_LIMIT : 0,
//         ...(trimmedQuery.length ? { previousQuery, previousPipeline } : {}),
//         isChatAgent,
//       };

//       try {
//         // Step 1: Records fetch
//         const response = await fetchCollectionRecords(payload);
//         if (cancelled) return;

//         const data = response?.data ?? {};
//         const nextRecords: any[] = Array.isArray(data.records)
//           ? Array.isArray(data.records[0])
//             ? []
//             : data.records
//           : [];
//         const total =
//           Number(
//             data.recordsTotal ?? data.records_total ?? nextRecords.length,
//           ) || nextRecords.length;

//         // Step 2: Build initial actionStates from record data
//         const recordIds = nextRecords
//           .map((rec: any) => rec?._id ?? rec?.id ?? "")
//           .filter(Boolean);

//         const initialStates: Record<string, RecordActionState> = {};
//         nextRecords.forEach((rec: any) => {
//           const id = rec?._id ?? rec?.id ?? "";
//           if (!id) return;
//           const { likeCount, viewCount, shareCount } = getInitialCounts(rec);
//           // No sessionStorage — server count is source of truth on every load
//           initialStates[id] = {
//             likeCount,
//             viewCount,
//             shareCount,
//             isLiked: false,
//           };
//         });

//         // Step 3: visitor id resolve
//         let visitorId = "";
//         try {
//           visitorId = localStorage.getItem("bv_visitor_id") ?? "";
//           if (!visitorId) {
//             visitorId =
//               "v_" +
//               Math.random().toString(36).slice(2) +
//               Date.now().toString(36);
//             localStorage.setItem("bv_visitor_id", visitorId);
//           }
//         } catch {
//           /* ignore */
//         }

//         const resolvedUserId = userId || visitorId;
//         const isVisitor = !userId;

//         // Step 4: fetchLikesHistory
//         const likesRes = recordIds.length
//           ? await fetchLikesHistory({
//               collection_name: currentCollection,
//               records: recordIds,
//               id: resolvedUserId,
//               is_visitor: isVisitor,
//             }).catch((err) => {
//               console.error("[LIKES_HISTORY] fetch error:", err);
//               return null;
//             })
//           : null;

//         if (cancelled) return;

//         // Step 5: ✅ FIXED — Merge likesHistory with stats.impressions → viewCount
//         const mergedStates = { ...initialStates };
//         const likesData = likesRes?.data;
//         if (likesData) {
//           Object.entries(likesData).forEach(
//             ([recordId, info]: [string, any]) => {
//               if (!mergedStates[recordId]) return;

//               // ✅ stats.impressions = increment-impressions-v2 API je field update kare che
//               const serverImpressions =
//                 info.stats?.impressions ??
//                 info.stats?.ALL?.impressions ??
//                 info.stats?.GLOBAL?.impressions ??
//                 null;

//               mergedStates[recordId] = {
//                 ...mergedStates[recordId],
//                 likeCount:
//                   info.stats?.likes ?? mergedStates[recordId].likeCount,
//                 isLiked: info.liked ?? mergedStates[recordId].isLiked,
//                 // Server impression count — source of truth on every load
//                 viewCount:
//                   serverImpressions !== null
//                     ? serverImpressions
//                     : mergedStates[recordId].viewCount,
//                 // stats.views = increment-views API = shareCount
//                 shareCount:
//                   info.stats?.views != null
//                     ? info.stats.views
//                     : mergedStates[recordId].shareCount,
//               };
//             },
//           );
//         }

//         // Step 6: single render — no flicker
//         setRecords(nextRecords);
//         setTotalRecords(total);
//         setActionStates(mergedStates);
//         setPreviousPipeline(data.previousPipeline);
//         setPreviousQuery(data.previousQuery);
//       } catch (error) {
//         if (!cancelled) {
//           console.error("Error loading records:", error);
//           setErrorMessage("Failed to load collection records.");
//           setRecords([]);
//           setTotalRecords(0);
//           setActionStates({});
//         }
//       } finally {
//         if (!cancelled) setIsLoading(false);
//       }
//     };

//     loadRecords();
//     return () => {
//       cancelled = true;
//     };
//   }, [
//     currentCollection,
//     userId,
//     sessionId,
//     page,
//     searchQuery,
//     isChatAgent,
//     templatesLoading,
//     templatesError,
//   ]); // eslint-disable-line react-hooks/exhaustive-deps

//   if (templatesLoading)
//     return (
//       <div className="chat-collection-screen">
//         <div className="collection-state">Loading collection templates...</div>
//       </div>
//     );
//   if (templatesError)
//     return (
//       <div className="chat-collection-screen">
//         <div className="collection-state error">{templatesError}</div>
//       </div>
//     );
//   if (!collectionNames.length)
//     return (
//       <div className="chat-collection-screen">
//         <div className="collection-state">No collections found.</div>
//       </div>
//     );
//   if (!userId || !sessionId)
//     return (
//       <div className="chat-collection-screen">
//         <div className="collection-state">
//           Start a chat to load collection records.
//         </div>
//       </div>
//     );

//   const template = currentCollection
//     ? collectionTemplateMap.get(currentCollection)
//     : undefined;

//   return (
//     <div className="chat-collection-screen">
//       <div className="collection-screen-header">
//         <h3 className="collection-screen-title">Collections</h3>
//       </div>
//       <div className="collection-tab-list">
//         {collectionNames.map((name) => (
//           <button
//             key={name}
//             type="button"
//             className={`collection-tab ${name === currentCollection ? "active" : ""}`}
//             onClick={() => setCurrentCollection(name)}
//             title={name}
//           >
//             {name}
//           </button>
//         ))}
//       </div>

//       {isLoading ? (
//         <div className="collection-state">Loading records...</div>
//       ) : errorMessage ? (
//         <div className="collection-state error">{errorMessage}</div>
//       ) : !template ? (
//         <div className="collection-state">Collection template unavailable.</div>
//       ) : records.length === 0 ? (
//         <div className="collection-state">No records found.</div>
//       ) : (
//         <div className="collection-screen-body">
//           <div className="collection-records" ref={scrollContainerRef}>
//             {records.map((record, index) => {
//               const iframeDoc = buildCollectionRecordIframeDoc(
//                 record,
//                 template,
//                 index,
//               );
//               const recordId = iframeDoc.recordId;

//               const resolvedCollectionName =
//                 record?.collection_name ??
//                 record?.collection ??
//                 currentCollection ??
//                 "";
//               recordCollectionMap.current[recordId] = resolvedCollectionName;
//               recordUrlMap.current[recordId] =
//                 record?.url ??
//                 record?.link ??
//                 record?.page_url ??
//                 record?.website ??
//                 "";

//               const actionState = actionStates[recordId] ?? {
//                 likeCount: iframeDoc.initialLikeCount,
//                 viewCount: iframeDoc.initialViewCount,
//                 shareCount: iframeDoc.initialShareCount,
//                 isLiked: false,
//               };

//               return (
//                 <div
//                   key={`${currentCollection}-${index}`}
//                   className="collection-record-card"
//                   data-record-id={recordId}
//                   data-collection-name={resolvedCollectionName}
//                   style={{ display: "flex", flexDirection: "column" }}
//                 >
//                   <iframe
//                     ref={(el) => {
//                       iframeRefs.current[recordId] = el;
//                     }}
//                     title={`Collection ${currentCollection} record ${index + 1}`}
//                     sandbox="allow-scripts allow-same-origin allow-popups"
//                     style={{
//                       width: iframeDoc.frameWidth,
//                       height: iframeDoc.frameHeight,
//                       display: "block",
//                       border: "none",
//                     }}
//                     srcDoc={iframeDoc.srcDoc}
//                   />
//                   <CardActionButtons
//                     recordId={recordId}
//                     state={actionState}
//                     collectionName={iframeDoc.collectionName}
//                     onLikeToggle={handleLikeToggle}
//                     onShareClick={handleShareClick}
//                   />
//                 </div>
//               );
//             })}
//           </div>

//           {totalPages > 1 && (
//             <div className="collection-pagination">
//               <button
//                 type="button"
//                 className="collection-page-btn"
//                 onClick={() => setPage((prev) => Math.max(1, prev - 1))}
//                 disabled={page <= 1}
//               >
//                 Previous
//               </button>
//               <span className="collection-page-info">
//                 Page {page} of {totalPages}
//               </span>
//               <button
//                 type="button"
//                 className="collection-page-btn"
//                 onClick={() =>
//                   setPage((prev) => Math.min(totalPages, prev + 1))
//                 }
//                 disabled={page >= totalPages}
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }



// ChatCollectionsScreen.tsx
// ✅ FIXED: stats.impressions → viewCount on refresh (increment-impressions-v2 updates this field)
// ✅ Uses CollectionRecordCard common component — no duplicate icon/button code

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionTemplate } from "../types/index";
import { fetchCollectionRecords, fetchLikesHistory } from "../services/api";
import { buildCollectionRecordIframeDoc } from "../utils/collections";
import { CONNECTOR_BASE_URL } from "../config/constants";
import {
  CollectionRecordCard,
  type RecordActionState,
} from "./common/Collectioncard";

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
    // ✅ impressions = increment-impressions-v2 API je field update kare che
    viewCount:
      rec?.view_count ??
      rec?.views ??
      statsAll?.impressions ??
      statsAll?.views ??
      0,
    shareCount: rec?.share_count ?? rec?.shares ?? statsAll?.shares ?? 0,
  };
};

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
  const [actionStates, setActionStates] = useState<Record<string, RecordActionState>>({});

  // ✅ Ref maps — passed to CollectionRecordCard so it can populate them
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const recordCollectionMap = useRef<Record<string, string>>({});
  const recordUrlMap = useRef<Record<string, string>>({});

  const totalPages = useMemo(() => {
    if (!totalRecords) return 1;
    return Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
  }, [totalRecords]);

  // ── Like + Toggle postMessage handler ────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, recordId, likeCount, isLiked, success } = event.data ?? {};

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

      if (type === "BV_LIKE_TOGGLE_RESPONSE" && recordId) {
        setActionStates((prev) => {
          const current = prev[recordId];
          if (!current) return prev;
          if (success) {
            return { ...prev, [recordId]: { ...current, likeCount, isLiked } };
          }
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

  // ── Impression — visible cards only, batch API, once per card per page ───
  useEffect(() => {
    if (!records.length || !currentCollection) return;

    firedRef.current = new Set();
    const container = scrollContainerRef.current;
    if (!container) return;

    const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const readyToBatch = new Map<string, string>();
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    const fireBatch = async () => {
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
          batch.forEach(({ _id }) => firedRef.current.delete(_id));
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
        console.error("[IMP] Batch error:", err);
        batch.forEach(({ _id }) => firedRef.current.delete(_id));
      }
    };

    const scheduleBatch = () => {
      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(fireBatch, 200);
    };

    const startDwell = (id: string, coll: string, el: HTMLElement) => {
      if (dwellTimers.has(id)) return;
      const t = setTimeout(() => {
        dwellTimers.delete(id);
        if (firedRef.current.has(id)) return;
        if (isCardVisibleInContainer(el, container)) {
          firedRef.current.add(id);
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
          if (!id || !coll || firedRef.current.has(id)) return;
          if (entry.isIntersecting && isCardVisibleInContainer(el, container)) {
            startDwell(id, coll, el);
          } else {
            cancelDwell(id);
          }
        });
      },
      { root: null, threshold: 0.5 },
    );

    const onHorizontalScroll = () => {
      container
        .querySelectorAll<HTMLElement>("[data-record-id]")
        .forEach((el) => {
          const id = el.dataset.recordId!;
          const coll = el.dataset.collectionName!;
          if (!id || !coll || firedRef.current.has(id)) return;
          if (isCardVisibleInContainer(el, container)) {
            startDwell(id, coll, el);
          } else {
            cancelDwell(id);
          }
        });
    };

    container
      .querySelectorAll<HTMLElement>("[data-record-id]")
      .forEach((el) => observer.observe(el));
    container.addEventListener("scroll", onHorizontalScroll, { passive: true });
    onHorizontalScroll();

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", onHorizontalScroll);
      dwellTimers.forEach((t) => clearTimeout(t));
      dwellTimers.clear();
      if (batchTimer) clearTimeout(batchTimer);
    };
  }, [records, currentCollection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Like toggle ───────────────────────────────────────────────────────────
  const handleLikeToggle = (recordId: string) => {
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
  };

  // ── Share click → increment-views API + optimistic +1 + redirect ──────────
  const handleShareClick = async (recordId: string) => {
    const collectionName =
      recordCollectionMap.current[recordId] ?? currentCollection ?? "";
    const recordUrl = recordUrlMap.current[recordId] ?? "";

    setActionStates((prev) => {
      const current = prev[recordId];
      if (!current) return prev;
      return {
        ...prev,
        [recordId]: { ...current, shareCount: current.shareCount + 1 },
      };
    });

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
  };

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

  useEffect(() => {
    setPage(1);
    setPreviousPipeline(undefined);
    setPreviousQuery(undefined);
  }, [currentCollection, searchQuery]);

  // ── ✅ FIXED: Records + LikesHistory fetch with stats.impressions → viewCount ──
  useEffect(() => {
    if (templatesLoading || templatesError) return;
    if (!currentCollection || !userId || !sessionId) {
      setRecords([]);
      setTotalRecords(0);
      setActionStates({});
      return;
    }

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
        // Step 1: Records fetch
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

        // Step 2: Build initial actionStates from record data
        const recordIds = nextRecords
          .map((rec: any) => rec?._id ?? rec?.id ?? "")
          .filter(Boolean);

        const initialStates: Record<string, RecordActionState> = {};
        nextRecords.forEach((rec: any) => {
          const id = rec?._id ?? rec?.id ?? "";
          if (!id) return;
          const { likeCount, viewCount, shareCount } = getInitialCounts(rec);
          initialStates[id] = { likeCount, viewCount, shareCount, isLiked: false };
        });

        // Step 3: visitor id resolve
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
        } catch { /* ignore */ }

        const resolvedUserId = userId || visitorId;
        const isVisitor = !userId;

        // Step 4: fetchLikesHistory
        const likesRes = recordIds.length
          ? await fetchLikesHistory({
              collection_name: currentCollection,
              records: recordIds,
              id: resolvedUserId,
              is_visitor: isVisitor,
            }).catch((err) => {
              console.error("[LIKES_HISTORY] fetch error:", err);
              return null;
            })
          : null;

        if (cancelled) return;

        // Step 5: ✅ FIXED — Merge likesHistory with stats.impressions → viewCount
        const mergedStates = { ...initialStates };
        const likesData = likesRes?.data;
        if (likesData) {
          Object.entries(likesData).forEach(
            ([recordId, info]: [string, any]) => {
              if (!mergedStates[recordId]) return;

              const serverImpressions =
                info.stats?.impressions ??
                info.stats?.ALL?.impressions ??
                info.stats?.GLOBAL?.impressions ??
                null;

              mergedStates[recordId] = {
                ...mergedStates[recordId],
                likeCount:
                  info.stats?.likes ?? mergedStates[recordId].likeCount,
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
            },
          );
        }

        // Step 6: single render — no flicker
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
    return () => { cancelled = true; };
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

  if (templatesLoading)
    return (
      <div className="chat-collection-screen">
        <div className="collection-state">Loading collection templates...</div>
      </div>
    );
  if (templatesError)
    return (
      <div className="chat-collection-screen">
        <div className="collection-state error">{templatesError}</div>
      </div>
    );
  if (!collectionNames.length)
    return (
      <div className="chat-collection-screen">
        <div className="collection-state">No collections found.</div>
      </div>
    );
  if (!userId || !sessionId)
    return (
      <div className="chat-collection-screen">
        <div className="collection-state">
          Start a chat to load collection records.
        </div>
      </div>
    );

  const template = currentCollection
    ? collectionTemplateMap.get(currentCollection)
    : undefined;

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
        <div className="collection-state">Loading records...</div>
      ) : errorMessage ? (
        <div className="collection-state error">{errorMessage}</div>
      ) : !template ? (
        <div className="collection-state">Collection template unavailable.</div>
      ) : records.length === 0 ? (
        <div className="collection-state">No records found.</div>
      ) : (
        <div className="collection-screen-body">
          <div className="collection-records" ref={scrollContainerRef}>
            {records.map((record, index) => {
              // Pre-compute recordId for actionState lookup (same as inside CollectionRecordCard)
              const iframeDoc = buildCollectionRecordIframeDoc(record, template, index);
              const recordId = iframeDoc.recordId;

              const actionState = actionStates[recordId] ?? {
                likeCount: iframeDoc.initialLikeCount,
                viewCount: iframeDoc.initialViewCount,
                shareCount: iframeDoc.initialShareCount,
                isLiked: false,
              };

              return (
                // ✅ Use common CollectionRecordCard with layout="vertical"
                <CollectionRecordCard
                  key={`${currentCollection}-${index}`}
                  record={record}
                  template={template}
                  recordIndex={index}
                  actionState={actionState}
                  layout="horizontal"
                  iframeRefs={iframeRefs}
                  recordCollectionMap={recordCollectionMap}
                  recordUrlMap={recordUrlMap}
                  onLikeToggle={handleLikeToggle}
                  onShareClick={handleShareClick}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="collection-pagination">
              <button
                type="button"
                className="collection-page-btn"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}