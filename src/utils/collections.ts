// //collection file

// import type { CollectionEntry, CollectionTemplate } from "../types";
// import {
//   COLLECTION_IFRAME_CONFIG,
//   IFRAME_RENDER_WRAPPER_CSS,
//   type IframeOutputRatio,
// } from "../config/collections";
// import { CONNECTOR_BASE_URL } from "../config/constants";

// export const mapMongoRagResponseToCollections = (
//   mongoRagResponse?: Record<string, any>,
// ): CollectionEntry[] => {
//   if (!mongoRagResponse || typeof mongoRagResponse !== "object") {
//     return [];
//   }

//   return Object.entries(mongoRagResponse).map(([collectionKey, value]) => {
//     const records = value?.records;
//     const normalizedRecords = Array.isArray(records)
//       ? Array.isArray(records[0])
//         ? []
//         : records
//       : [];

//     return {
//       collectionKey,
//       records: normalizedRecords,
//     };
//   });
// };

// const getValueByPath = (obj: any, path: string): any => {   
//   if (!obj) return null;

//   const parts = path
//     .replace(/\[(\d+)\]/g, ".$1")
//     .split(".")
//     .filter(Boolean);

//   let result = parts.reduce(
//     (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
//     obj,
//   );

//   if (Array.isArray(result)) {
//     result = result
//       .map((value) =>
//         typeof value === "object" ? JSON.stringify(value) : value,
//       )
//       .join(", ");
//   }

//   if (typeof result === "object" && result !== null) {
//     result = JSON.stringify(result);
//   }

//   return result;
// };

// export const buildEmptyCollectionHtml = (): string => {
//   return `
//     <div class="empty-collection">
//       <h4>No items found</h4>
//       <p>This collection does not have any data yet.</p>
//     </div>
//   `;
// };

// // ─── Helper: extract like count from any record shape ─────────────────────────
// // Featured API returns: stats: { likes, views, impressions }  OR  stats: { ALL: { likes } }
// // Chat collections return: like_count / likes directly on record
// const extractLikeCount = (rec: any): number =>
//   rec?.like_count ??
//   rec?.likes ??
//   rec?.stats?.likes ??
//   rec?.stats?.ALL?.likes ??
//   rec?.stats?.GLOBAL?.likes ??
//   0;

// // ─── Helper: extract view count from any record shape ─────────────────────────
// const extractViewCount = (rec: any): number =>
//   rec?.view_count ??
//   rec?.views ??
//   rec?.stats?.views ??
//   rec?.stats?.ALL?.views ??
//   rec?.stats?.GLOBAL?.views ??
//   0;

// // ─── Helper: extract share count from any record shape ────────────────────────
// const extractShareCount = (rec: any): number =>
//   rec?.share_count ??
//   rec?.shares ??
//   rec?.stats?.shares ??
//   rec?.stats?.ALL?.shares ??
//   rec?.stats?.GLOBAL?.shares ??
//   0;

// // ─── Like script ──────────────────────────────────────────────────────────────
// const buildLikeScript = (
//   collectionName: string,
//   recordsData: { id: string; likeCount: number }[],
// ): string => `
//   const TOGGLE_LIKE_URL = '${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/toggle-like';
//   const LIKES_HISTORY_URL = '${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/user-likes-history';

//   function getVisitorId() {
//     let vid = localStorage.getItem('bv_visitor_id');
//     if (!vid) {
//       vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
//       localStorage.setItem('bv_visitor_id', vid);
//     }
//     return vid;
//   }

//   function getUserId() {
//     return localStorage.getItem('user_uuid') || null;
//   }

//   let RECORDS_DATA = ${JSON.stringify(recordsData)};
//   let USER_TOTAL_LIKES = 0;
//   const COLLECTION_NAME = '${collectionName}';
//   const COLLECTION_KEY = 'bv_' + COLLECTION_NAME;
//   const LOCK_TIMEOUT = 5000;

//   if (!window.top.BV_FETCH_LOCKS)  { window.top.BV_FETCH_LOCKS = {}; }
//   if (!window.top.BV_RUN_REGISTRY) { window.top.BV_RUN_REGISTRY = {}; }

//   const LOCKS   = window.top.BV_FETCH_LOCKS;
//   const RUN_REG = window.top.BV_RUN_REGISTRY;

//   const NOW = Date.now();
//   const RUN_WINDOW_MS = 500;

//   if (!RUN_REG[COLLECTION_KEY] || (NOW - RUN_REG[COLLECTION_KEY].startTime) > RUN_WINDOW_MS) {
//     RUN_REG[COLLECTION_KEY] = {
//       token: 'run_' + NOW + '_' + Math.random().toString(36).slice(2),
//       startTime: NOW,
//     };
//     delete LOCKS[COLLECTION_KEY];
//   }

//   if (!LOCKS[COLLECTION_KEY]) {
//     LOCKS[COLLECTION_KEY] = {
//       allRecordIds: new Set(),
//       fetchPromise: null,
//       debounceTimer: null,
//       lastFetchTime: 0,
//       instances: 0,
//     };
//   }

//   const STATE = LOCKS[COLLECTION_KEY];
//   const INSTANCE_ID = ++STATE.instances;

//   RECORDS_DATA.forEach(r => {
//     if (r.id && !STATE.allRecordIds.has(r.id)) STATE.allRecordIds.add(r.id);
//   });

//   function getLikeData() {
//     try { return JSON.parse(localStorage.getItem('bv_like_data') || '{}'); }
//     catch { return {}; }
//   }

//   function saveLikeData(recordId, isLiked, count) {
//     try {
//       const data = getLikeData();
//       data[recordId] = { liked: isLiked, count };
//       localStorage.setItem('bv_like_data', JSON.stringify(data));
//     } catch (err) {}
//   }

//   function saveUserTotalLikes(total) {
//     try {
//       localStorage.setItem('bv_user_total_likes', total.toString());
//       USER_TOTAL_LIKES = total;
//     } catch (err) {}
//   }

//   function getUserTotalLikes() {
//     try {
//       const saved = localStorage.getItem('bv_user_total_likes');
//       return saved ? parseInt(saved, 10) : 0;
//     } catch { return 0; }
//   }

//   async function fetchLikesHistory() {
//     const now = Date.now();
//     if (now - STATE.lastFetchTime > LOCK_TIMEOUT) {
//       STATE.fetchPromise = null;
//       STATE.lastFetchTime = 0;
//     }
//     if (STATE.fetchPromise) return await STATE.fetchPromise;
//     if (STATE.debounceTimer) clearTimeout(STATE.debounceTimer);

//     return new Promise((resolve) => {
//       STATE.debounceTimer = setTimeout(async () => {
//         if (STATE.fetchPromise) { resolve(await STATE.fetchPromise); return; }

//         const allRecordIds = Array.from(STATE.allRecordIds);
//         const userUUID = getUserId();
//         const userId = userUUID || getVisitorId();
//         STATE.lastFetchTime = Date.now();

//         STATE.fetchPromise = (async () => {
//           try {
//             const response = await fetch(LIKES_HISTORY_URL, {
//               method: 'POST',
//               headers: { 'accept': '*/*', 'content-type': 'application/json' },
//               body: JSON.stringify({
//                 collection_name: COLLECTION_NAME,
//                 records: allRecordIds,
//                 id: userId,
//                 is_visitor: !userUUID,
//               }),
//             });
//             if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
//             const result = await response.json();
//             const likesMap = result?.data || {};
//             const userStats = result?.user_stats || {};
//             try {
//               localStorage.setItem('bv_like_data', JSON.stringify(likesMap));
//               localStorage.setItem('bv_user_total_likes', (userStats.total_liked || 0).toString());
//             } catch (e) {}
//             return likesMap;
//           } catch (err) {
//             console.error(\`❌ [LIKE I\${INSTANCE_ID}] API FAILED:\`, err);
//             STATE.fetchPromise = null;
//             STATE.lastFetchTime = 0;
//             return {};
//           }
//         })();

//         resolve(await STATE.fetchPromise);
//       }, 200);
//     });
//   }

//   async function initLikes() {
//     USER_TOTAL_LIKES = getUserTotalLikes();
//     const likesMap = await fetchLikesHistory();

//     RECORDS_DATA.forEach(rec => {
//       const serverData = likesMap[rec.id];
//       if (serverData) {
//         // ✅ Support stats.likes / stats.ALL.likes / direct likes field
//         const count =
//           serverData.stats?.likes ??
//           serverData.stats?.ALL?.likes ??
//           serverData.stats?.GLOBAL?.likes ??
//           serverData.like_count ??
//           0;
//         const liked = serverData.liked ?? false;
//         window.parent.postMessage({
//           type: 'BV_LIKE_INIT',
//           recordId: rec.id,
//           likeCount: count,
//           isLiked: liked,
//         }, '*');
//       } else if (rec.likeCount > 0) {
//         // ✅ Fallback: use initial count passed from React (from featured API)
//         window.parent.postMessage({
//           type: 'BV_LIKE_INIT',
//           recordId: rec.id,
//           likeCount: rec.likeCount,
//           isLiked: false,
//         }, '*');
//       }
//     });
//   }

//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initLikes);
//   } else {
//     initLikes();
//   }

//   window.addEventListener('message', (event) => {
//     if (event.data?.type === 'BV_LIKE_TOGGLE_REQUEST') {
//       const { recordId } = event.data;
//       const rec = RECORDS_DATA.find(r => r.id === recordId);
//       if (!rec) return;

//       (async () => {
//         try {
//           const userUUID = getUserId();
//           const userId = userUUID || getVisitorId();
//           const response = await fetch(TOGGLE_LIKE_URL, {
//             method: 'POST',
//             headers: { 'accept': '*/*', 'content-type': 'application/json' },
//             body: JSON.stringify({
//               collection_name: COLLECTION_NAME, 
//               record_id: rec.id,
//               id: userId,
//               is_visitor: !userUUID,
//             }),
//           });
//           if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
//           const data = await response.json();
//           if (data && typeof data.like_count === 'number') {
//             const serverCount = data.like_count;
//             const serverLiked = data.is_liked ?? false;
//             saveLikeData(rec.id, serverLiked, serverCount);
//             window.parent.postMessage({
//               type: 'BV_LIKE_TOGGLE_RESPONSE',
//               recordId: rec.id,
//               likeCount: serverCount,
//               isLiked: serverLiked,
//               userTotalLikes: data.user_total_likes,
//               success: true,
//             }, '*');
//           }
//         } catch (err) {
//           console.error(\`❌ [LIKE I\${INSTANCE_ID}] Toggle error:\`, err);
//           window.parent.postMessage({
//             type: 'BV_LIKE_TOGGLE_RESPONSE',
//             recordId: rec.id,
//             success: false,
//           }, '*');
//         }
//       })();
//     }
//   });
// `;

// // ─── Impression script REMOVED ────────────────────────────────────────────────
// // Impressions are now handled entirely by React (ChatCollectionsScreen).
// // Removing from iframe prevents double-counting.

// export const buildCollectionHtml = (
//   records: any[],
//   templateHtml: string,
//   outputRatioCSSClass: string,
// ): string => {
//   const template = records
//     .map((record) => {
//       const doc = new DOMParser().parseFromString(templateHtml, "text/html");

//       doc.querySelectorAll("[id]").forEach((element) => {
//         const keyPath = element.id;
//         const value = getValueByPath(record, keyPath);
//         if (element.tagName.toLowerCase() === "img") {
//           element.setAttribute("src", typeof value === "string" ? value : "");
//         } else if (element.tagName.toLowerCase() === "a") {
//           element.setAttribute("href", typeof value === "string" ? value : "");
//           element.setAttribute("target", "_blank");
//         } else {
//           element.textContent = value ?? "";
//         }
//       });

//       const recordUrl =
//         typeof record?.url === "string" && record.url.trim().length > 0
//           ? record.url
//           : "#";

//       const recordId = record?._id ?? record?.id ?? "";

//       return `
//         <div class="swiper-slide">
//           <div class="collection-template-card ${outputRatioCSSClass}" data-record-id="${recordId}">
//             <a class="visit-button" href="${recordUrl}" target="_blank" rel="noopener noreferrer">Visit</a>
//             <div class="collection-template-card-body">${doc.body.innerHTML}</div>
//           </div>
//         </div>
//       `;
//     })
//     .join("");

//   return `
//     <div style="overflow: hidden;">
//       <div class="swiper mySwiper">
//         <div class="swiper-wrapper">
//           ${template}
//         </div>
//         <div class="swiper-pagination"></div>
//         <div class="swiper-button-next">
//           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//             <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="#5D5FEF" />
//           </svg>
//         </div>
//         <div class="swiper-button-prev">
//           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//             <path d="M15.41 7.41L10.83 12L15.41 16.59L14 18L8 12L14 6L15.41 7.41Z" fill="#5D5FEF" />
//           </svg>
//         </div>
//       </div>
//     </div>
//   `;
// };

// const buildSingleRecordHtml = (
//   record: any,
//   templateHtml: string,
//   outputRatioCSSClass: string,
// ): string => {
//   const doc = new DOMParser().parseFromString(templateHtml, "text/html");

//   doc.querySelectorAll("[id]").forEach((element) => {
//     const keyPath = element.id;
//     const value = getValueByPath(record, keyPath);
//     if (element.tagName.toLowerCase() === "img") {
//       element.setAttribute("src", typeof value === "string" ? value : "");
//     } else if (element.tagName.toLowerCase() === "a") {
//       element.setAttribute("href", typeof value === "string" ? value : "");
//       element.setAttribute("target", "_blank");
//     } else {
//       element.textContent = value ?? "";
//     }
//   });

//   const recordUrl =
//     typeof record?.url === "string" && record.url.trim().length > 0
//       ? record.url
//       : "#";

//   return `
//     <div class="collection-template-card ${outputRatioCSSClass}">
//       <a class="visit-button" href="${recordUrl}" target="_blank" rel="noopener noreferrer">Visit</a>
//       <div class="collection-template-card-body">${doc.body.innerHTML}</div>
//     </div>
//   `;
// };

// export type CollectionRecordIframeDoc = {
//   srcDoc: string;
//   frameWidth: string;
//   frameHeight: string;
//   recordId: string;
//   collectionName: string;
//   initialLikeCount: number;
//   initialViewCount: number;
//   initialShareCount: number;
// };

// export const buildCollectionRecordIframeDoc = (
//   record: any,
//   template: CollectionTemplate,
//   recordIndex: number = 0,
// ): {
//   srcDoc: string;
//   frameWidth: string;
//   frameHeight: string;
//   recordId: string;
//   collectionName: string;
//   initialLikeCount: number;
//   initialViewCount: number;
//   initialShareCount: number;
// } => {
//   const outputRatio =
//     template.output_ratio && template.output_ratio !== "0"
//       ? template.output_ratio
//       : "default";
//   const config =
//     COLLECTION_IFRAME_CONFIG[outputRatio as IframeOutputRatio] ||
//     COLLECTION_IFRAME_CONFIG.default;

//   const html = buildSingleRecordHtml(
//     record,
//     template.html || "",
//     config.cssClass,
//   );

//   const collectionName: string =
//     record?.collection_name ?? record?.collection ?? "";

//   const recordId = record?._id ?? record?.id ?? "";

//   // ✅ FIXED: Support stats.likes / stats.ALL.likes from featured API response
//   const likeRecordsData = [
//     {
//       id: recordId,
//       likeCount: extractLikeCount(record),
//     },
//   ];

//   const srcDoc = `<!doctype html>
// <html>
// <head>
//   <meta charset="utf-8" />
//   <style>
//     body { margin: 0; font-family: Arial; }
//     ${template.css || ""}
//     ${IFRAME_RENDER_WRAPPER_CSS}
//     .collection-template-card { max-width: 100% !important; position: relative; }
//   </style>
// </head>
// <body>
//   ${html}
//   <script>
//     ${buildLikeScript(collectionName, likeRecordsData)}
//     ${template.js || ""}
//   </script>
// </body>
// </html>`;

//   return {
//     srcDoc,
//     frameWidth: config.cardFrameWidth,
//     frameHeight: config.cardFrameHeight,
//     recordId,
//     collectionName,
//     initialLikeCount: extractLikeCount(record),
//     initialViewCount: extractViewCount(record),
//     initialShareCount: extractShareCount(record),
//   };
// };

// export const buildCollectionIframeDoc = (
//   records: any[],
//   template: CollectionTemplate,
//   collectionName?: string,
// ): { srcDoc: string; minHeight: string } => {
//   const outputRatio =
//     template.output_ratio && template.output_ratio !== "0"
//       ? template.output_ratio
//       : "default";
//   const config =
//     COLLECTION_IFRAME_CONFIG[outputRatio as IframeOutputRatio] ||
//     COLLECTION_IFRAME_CONFIG.default;

//   const slidesPerView = Number(config.cardItem) || 4;
//   const html = records?.length
//     ? buildCollectionHtml(records, template.html || "", config.cssClass)
//     : buildEmptyCollectionHtml();

//   const resolvedCollectionName =
//     collectionName ??
//     records?.[0]?.collection_name ??
//     records?.[0]?.collection ??
//     "";

//   // ✅ FIXED: Use extractLikeCount helper — supports stats.likes, stats.ALL.likes, like_count, likes
//   const likeRecordsData = (records ?? []).map((rec) => ({
//     id: rec?._id ?? rec?.id ?? "",
//     likeCount: extractLikeCount(rec),
//   }));

//   const srcDoc = `<!doctype html>
// <html>
// <head>
//   <meta charset="utf-8" />
//   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
//   <style>
//     body { margin: 0; font-family: Arial; }
//     .swiper { width: 100%; padding: 0; }
//     .product-card {
//       border: 1px solid #ddd;
//       padding: 10px;
//       border-radius: 6px;
//       background: #fff;
//     }
//     img { width: 100%; height: auto; border-radius: 4px; }
//     .swiper-button-next,
//     .swiper-button-prev {
//       background-color: #c6ccef;
//       width: 22px;
//       min-width: 22px;
//       height: 22px;
//       border-radius: 4px;
//       position: absolute;
//       box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
//     }
//     .swiper-button-next::after,
//     .swiper-button-prev::after { content: none; }
//     .swiper-button-next:hover,
//     .swiper-button-prev:hover { background-color: #5c5eec; }
//     .swiper-button-next:hover svg path,
//     .swiper-button-prev:hover svg path { fill: #fff; }
//     .collection-template-card { position: relative; }
//     ${template.css || ""}
//     ${IFRAME_RENDER_WRAPPER_CSS}
//   </style>
// </head>
// <body style="overflow: hidden;">
//   ${html}
//   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
//   <script>
//     const swiperInstance = new Swiper('.mySwiper', {
//       slidesPerView: ${slidesPerView},
//       spaceBetween: 12,
//       breakpoints: {
//         0: { slidesPerView: 2 },
//         480: { slidesPerView: 2 },
//         768: { slidesPerView: ${slidesPerView} }
//       },
//       navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
//       pagination: { el: '.swiper-pagination', clickable: true }
//     });
//   </script>
//   <script>
//     ${buildLikeScript(resolvedCollectionName, likeRecordsData)}
//     ${template.js || ""}
//   </script>
// </body>
// </html>`;

//   return { srcDoc, minHeight: config["min-height"] };
// };




//collection file

import type { CollectionEntry, CollectionTemplate } from "../types";
import {
  COLLECTION_IFRAME_CONFIG,
  IFRAME_RENDER_WRAPPER_CSS,
  type IframeOutputRatio,
} from "../config/collections";
import { CONNECTOR_BASE_URL } from "../config/constants";

export const mapMongoRagResponseToCollections = (
  mongoRagResponse?: Record<string, any>,
): CollectionEntry[] => {
  if (!mongoRagResponse || typeof mongoRagResponse !== "object") {
    return [];
  }

  return Object.entries(mongoRagResponse).map(([collectionKey, value]) => {
    const records = value?.records;
    const normalizedRecords = Array.isArray(records)
      ? Array.isArray(records[0])
        ? []
        : records
      : [];

    return {
      collectionKey,
      records: normalizedRecords,
    };
  });
};

const getValueByPath = (obj: any, path: string): any => {
  if (!obj) return null;

  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let result = parts.reduce(
    (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
    obj,
  );

  if (Array.isArray(result)) {
    result = result
      .map((value) =>
        typeof value === "object" ? JSON.stringify(value) : value,
      )
      .join(", ");
  }

  if (typeof result === "object" && result !== null) {
    result = JSON.stringify(result);
  }

  return result;
};

export const buildEmptyCollectionHtml = (): string => {
  return `
    <div class="empty-collection">
      <h4>No items found</h4>
      <p>This collection does not have any data yet.</p>
    </div>
  `;
};

// ─── Helper: extract like count from any record shape ─────────────────────────
const extractLikeCount = (rec: any): number =>
  rec?.like_count ??
  rec?.likes ??
  rec?.stats?.likes ??
  rec?.stats?.ALL?.likes ??
  rec?.stats?.GLOBAL?.likes ??
  0;

// ─── Helper: extract view count from any record shape ─────────────────────────
const extractViewCount = (rec: any): number =>
  rec?.view_count ??
  rec?.views ??
  rec?.stats?.views ??
  rec?.stats?.ALL?.views ??
  rec?.stats?.GLOBAL?.views ??
  0;

// ─── Helper: extract share count from any record shape ────────────────────────
const extractShareCount = (rec: any): number =>
  rec?.share_count ??
  rec?.shares ??
  rec?.stats?.shares ??
  rec?.stats?.ALL?.shares ??
  rec?.stats?.GLOBAL?.shares ??
  0;

// ─── Like script ──────────────────────────────────────────────────────────────
const buildLikeScript = (
  collectionName: string,
  recordsData: { id: string; likeCount: number }[],
): string => `
  const TOGGLE_LIKE_URL = '${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/toggle-like';
  const LIKES_HISTORY_URL = '${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/user-likes-history';

  function getVisitorId() {
    let vid = localStorage.getItem('bv_visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('bv_visitor_id', vid);
    }
    return vid;
  }

  function getUserId() {
    return localStorage.getItem('user_uuid') || null;
  }

  let RECORDS_DATA = ${JSON.stringify(recordsData)};
  let USER_TOTAL_LIKES = 0;
  const COLLECTION_NAME = '${collectionName}';
  const COLLECTION_KEY = 'bv_' + COLLECTION_NAME;
  const LOCK_TIMEOUT = 5000;

  if (!window.top.BV_FETCH_LOCKS)  { window.top.BV_FETCH_LOCKS = {}; }
  if (!window.top.BV_RUN_REGISTRY) { window.top.BV_RUN_REGISTRY = {}; }

  const LOCKS   = window.top.BV_FETCH_LOCKS;
  const RUN_REG = window.top.BV_RUN_REGISTRY;

  const NOW = Date.now();
  const RUN_WINDOW_MS = 500;

  if (!RUN_REG[COLLECTION_KEY] || (NOW - RUN_REG[COLLECTION_KEY].startTime) > RUN_WINDOW_MS) {
    RUN_REG[COLLECTION_KEY] = {
      token: 'run_' + NOW + '_' + Math.random().toString(36).slice(2),
      startTime: NOW,
    };
    delete LOCKS[COLLECTION_KEY];
  }

  if (!LOCKS[COLLECTION_KEY]) {
    LOCKS[COLLECTION_KEY] = {
      allRecordIds: new Set(),
      fetchPromise: null,
      debounceTimer: null,
      lastFetchTime: 0,
      instances: 0,
    };
  }

  const STATE = LOCKS[COLLECTION_KEY];
  const INSTANCE_ID = ++STATE.instances;

  RECORDS_DATA.forEach(r => {
    if (r.id && !STATE.allRecordIds.has(r.id)) STATE.allRecordIds.add(r.id);
  });

  function getLikeData() {
    try { return JSON.parse(localStorage.getItem('bv_like_data') || '{}'); }
    catch { return {}; }
  }

  function saveLikeData(recordId, isLiked, count) {
    try {
      const data = getLikeData();
      data[recordId] = { liked: isLiked, count };
      localStorage.setItem('bv_like_data', JSON.stringify(data));
    } catch (err) {}
  }

  function saveUserTotalLikes(total) {
    try {
      localStorage.setItem('bv_user_total_likes', total.toString());
      USER_TOTAL_LIKES = total;
    } catch (err) {}
  }

  function getUserTotalLikes() {
    try {
      const saved = localStorage.getItem('bv_user_total_likes');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  }

  async function fetchLikesHistory() {
    const now = Date.now();
    if (now - STATE.lastFetchTime > LOCK_TIMEOUT) {
      STATE.fetchPromise = null;
      STATE.lastFetchTime = 0;
    }
    if (STATE.fetchPromise) return await STATE.fetchPromise;
    if (STATE.debounceTimer) clearTimeout(STATE.debounceTimer);

    return new Promise((resolve) => {
      STATE.debounceTimer = setTimeout(async () => {
        if (STATE.fetchPromise) { resolve(await STATE.fetchPromise); return; }

        const allRecordIds = Array.from(STATE.allRecordIds);
        const userUUID = getUserId();
        const userId = userUUID || getVisitorId();
        STATE.lastFetchTime = Date.now();

        STATE.fetchPromise = (async () => {
          try {
            const response = await fetch(LIKES_HISTORY_URL, {
              method: 'POST',
              headers: { 'accept': '*/*', 'content-type': 'application/json' },
              body: JSON.stringify({
                collection_name: COLLECTION_NAME,
                records: allRecordIds,
                id: userId,
                is_visitor: !userUUID,
              }),
            });
            if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
            const result = await response.json();
            const likesMap = result?.data || {};
            const userStats = result?.user_stats || {};
            try {
              localStorage.setItem('bv_like_data', JSON.stringify(likesMap));
              localStorage.setItem('bv_user_total_likes', (userStats.total_liked || 0).toString());
            } catch (e) {}
            return likesMap;
          } catch (err) {
            console.error(\`❌ [LIKE I\${INSTANCE_ID}] API FAILED:\`, err);
            STATE.fetchPromise = null;
            STATE.lastFetchTime = 0;
            return {};
          }
        })();

        resolve(await STATE.fetchPromise);
      }, 200);
    });
  }

  async function initLikes() {
    USER_TOTAL_LIKES = getUserTotalLikes();
    const likesMap = await fetchLikesHistory();

    RECORDS_DATA.forEach(rec => {
      const serverData = likesMap[rec.id];
      if (serverData) {
        const count =
          serverData.stats?.likes ??
          serverData.stats?.ALL?.likes ??
          serverData.stats?.GLOBAL?.likes ??
          serverData.like_count ??
          0;
        const liked = serverData.liked ?? false;
        window.parent.postMessage({
          type: 'BV_LIKE_INIT',
          recordId: rec.id,
          likeCount: count,
          isLiked: liked,
        }, '*');
      } else if (rec.likeCount > 0) {
        window.parent.postMessage({
          type: 'BV_LIKE_INIT',
          recordId: rec.id,
          likeCount: rec.likeCount,
          isLiked: false,
        }, '*');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLikes);
  } else {
    initLikes();
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'BV_LIKE_TOGGLE_REQUEST') {
      const { recordId } = event.data;
      const rec = RECORDS_DATA.find(r => r.id === recordId);
      if (!rec) return;

      (async () => {
        try {
          const userUUID = getUserId();
          const userId = userUUID || getVisitorId();
          const response = await fetch(TOGGLE_LIKE_URL, {
            method: 'POST',
            headers: { 'accept': '*/*', 'content-type': 'application/json' },
            body: JSON.stringify({
              collection_name: COLLECTION_NAME,
              record_id: rec.id,
              id: userId,
              is_visitor: !userUUID,
            }),
          });
          if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
          const data = await response.json();
          if (data && typeof data.like_count === 'number') {
            const serverCount = data.like_count;
            const serverLiked = data.is_liked ?? false;
            saveLikeData(rec.id, serverLiked, serverCount);
            window.parent.postMessage({
              type: 'BV_LIKE_TOGGLE_RESPONSE',
              recordId: rec.id,
              likeCount: serverCount,
              isLiked: serverLiked,
              userTotalLikes: data.user_total_likes,
              success: true,
            }, '*');
          }
        } catch (err) {
          console.error(\`❌ [LIKE I\${INSTANCE_ID}] Toggle error:\`, err);
          window.parent.postMessage({
            type: 'BV_LIKE_TOGGLE_RESPONSE',
            recordId: rec.id,
            success: false,
          }, '*');
        }
      })();
    }
  });
`;

// ─── Impression script REMOVED ────────────────────────────────────────────────
// Impressions are now handled entirely by React (ChatCollectionsScreen).

export const buildCollectionHtml = (
  records: any[],
  templateHtml: string,
  outputRatioCSSClass: string,
): string => {
  const template = records
    .map((record) => {
      const doc = new DOMParser().parseFromString(templateHtml, "text/html");

      doc.querySelectorAll("[id]").forEach((element) => {
        const keyPath = element.id;
        const value = getValueByPath(record, keyPath);
        if (element.tagName.toLowerCase() === "img") {
          element.setAttribute("src", typeof value === "string" ? value : "");
        } else if (element.tagName.toLowerCase() === "a") {
          element.setAttribute("href", typeof value === "string" ? value : "");
          element.setAttribute("target", "_blank");
        } else {
          element.textContent = value ?? "";
        }
      });

      const recordUrl =
        typeof record?.url === "string" && record.url.trim().length > 0
          ? record.url
          : "#";

      const recordId = record?._id ?? record?.id ?? "";

      // ✅ FIX 1: swiper card div — contain + overflow + isolation
      return `
        <div class="swiper-slide">
          <div class="collection-template-card ${outputRatioCSSClass}" data-record-id="${recordId}" style="overflow:hidden!important;contain:layout style;isolation:isolate;position:relative;">
            <a class="visit-button" href="${recordUrl}" target="_blank" rel="noopener noreferrer">Visit</a>
            <div class="collection-template-card-body">${doc.body.innerHTML}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div style="overflow: hidden;">
      <div class="swiper mySwiper">
        <div class="swiper-wrapper">
          ${template}
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-next">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="#5D5FEF" />
          </svg>
        </div>
        <div class="swiper-button-prev">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.41 7.41L10.83 12L15.41 16.59L14 18L8 12L14 6L15.41 7.41Z" fill="#5D5FEF" />
          </svg>
        </div>
      </div>
    </div>
  `;
};

const buildSingleRecordHtml = (
  record: any,
  templateHtml: string,
  outputRatioCSSClass: string,
): string => {
  const doc = new DOMParser().parseFromString(templateHtml, "text/html");

  doc.querySelectorAll("[id]").forEach((element) => {
    const keyPath = element.id;
    const value = getValueByPath(record, keyPath);
    if (element.tagName.toLowerCase() === "img") {
      element.setAttribute("src", typeof value === "string" ? value : "");
    } else if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("href", typeof value === "string" ? value : "");
      element.setAttribute("target", "_blank");
    } else {
      element.textContent = value ?? "";
    }
  });

  const recordUrl =
    typeof record?.url === "string" && record.url.trim().length > 0
      ? record.url
      : "#";

  // ✅ FIX 2: single card div — contain + overflow + isolation
  return `
    <div class="collection-template-card ${outputRatioCSSClass}" style="overflow:hidden!important;contain:layout style;isolation:isolate;position:relative;">
      <a class="visit-button" href="${recordUrl}" target="_blank" rel="noopener noreferrer">Visit</a>
      <div class="collection-template-card-body">${doc.body.innerHTML}</div>
    </div>
  `;
};

export type CollectionRecordIframeDoc = {
  srcDoc: string;
  frameWidth: string;
  frameHeight: string;
  recordId: string;
  collectionName: string;
  initialLikeCount: number;
  initialViewCount: number;
  initialShareCount: number;
};

export const buildCollectionRecordIframeDoc = (
  record: any,
  template: CollectionTemplate,
  recordIndex: number = 0,
): {
  srcDoc: string;
  frameWidth: string;
  frameHeight: string;
  recordId: string;
  collectionName: string;
  initialLikeCount: number;
  initialViewCount: number;
  initialShareCount: number;
} => {
  const outputRatio =
    template.output_ratio && template.output_ratio !== "0"
      ? template.output_ratio
      : "default";
  const config =
    COLLECTION_IFRAME_CONFIG[outputRatio as IframeOutputRatio] ||
    COLLECTION_IFRAME_CONFIG.default;

  const html = buildSingleRecordHtml(
    record,
    template.html || "",
    config.cssClass,
  );

  const collectionName: string =
    record?.collection_name ?? record?.collection ?? "";

  const recordId = record?._id ?? record?.id ?? "";

  const likeRecordsData = [
    {
      id: recordId,
      likeCount: extractLikeCount(record),
    },
  ];

  // ✅ FIX 3: srcDoc — html/body contain:strict + card override with !important
  const srcDoc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: Arial;
    }
    ${template.css || ""}
    ${IFRAME_RENDER_WRAPPER_CSS}
    /* ✅ Override any backend CSS that breaks containment */
    .collection-template-card {
      max-width: 80% !important;
      position: relative !important;
      overflow: hidden !important;
      contain: layout style !important;
      isolation: isolate !important;
    }
    .collection-template-card * {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  ${html}
  <script>
    ${buildLikeScript(collectionName, likeRecordsData)}
    ${template.js || ""}
  </script>
</body>
</html>`;

  return {
    srcDoc,
    frameWidth: config.cardFrameWidth,
    frameHeight: config.cardFrameHeight,
    recordId,
    collectionName,
    initialLikeCount: extractLikeCount(record),
    initialViewCount: extractViewCount(record),
    initialShareCount: extractShareCount(record),
  };
};

export const buildCollectionIframeDoc = (
  records: any[],
  template: CollectionTemplate,
  collectionName?: string,
): { srcDoc: string; minHeight: string } => {
  const outputRatio =
    template.output_ratio && template.output_ratio !== "0"
      ? template.output_ratio
      : "default";
  const config =
    COLLECTION_IFRAME_CONFIG[outputRatio as IframeOutputRatio] ||
    COLLECTION_IFRAME_CONFIG.default;

  const slidesPerView = Number(config.cardItem) || 4;
  const html = records?.length
    ? buildCollectionHtml(records, template.html || "", config.cssClass)
    : buildEmptyCollectionHtml();

  const resolvedCollectionName =
    collectionName ??
    records?.[0]?.collection_name ??
    records?.[0]?.collection ??
    "";

  const likeRecordsData = (records ?? []).map((rec) => ({
    id: rec?._id ?? rec?.id ?? "",
    likeCount: extractLikeCount(rec),
  }));

  // ✅ FIX 4: swiper iframe — same card override
  const srcDoc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
  <style>
    body { margin: 0; font-family: Arial; }
    .swiper { width: 100%; padding: 0; }
    .product-card {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 6px;
      background: #fff;
    }
    img { width: 100%; height: auto; border-radius: 4px; }
    .swiper-button-next,
    .swiper-button-prev {
      background-color: #c6ccef;
      width: 22px;
      min-width: 22px;
      height: 22px;
      border-radius: 4px;
      position: absolute;
      box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
    }
    .swiper-button-next::after,
    .swiper-button-prev::after { content: none; }
    .swiper-button-next:hover,
    .swiper-button-prev:hover { background-color: #5c5eec; }
    .swiper-button-next:hover svg path,
    .swiper-button-prev:hover svg path { fill: #fff; }
    ${template.css || ""}
    ${IFRAME_RENDER_WRAPPER_CSS}
    /* ✅ Override any backend CSS that breaks containment */
    .collection-template-card {
      position: relative !important;
      overflow: hidden !important;
      contain: layout style !important;
      isolation: isolate !important;
    }
    .collection-template-card * {
      max-width: 100% !important;
    }
    .swiper-slide {
      overflow: hidden;
    }
  </style>
</head>
<body style="overflow: hidden;">
  ${html}
  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
  <script>
    const swiperInstance = new Swiper('.mySwiper', {
      slidesPerView: ${slidesPerView},
      spaceBetween: 12,
      breakpoints: {
        0: { slidesPerView: 2 },
        480: { slidesPerView: 2 },
        768: { slidesPerView: ${slidesPerView} }
      },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      pagination: { el: '.swiper-pagination', clickable: true }
    });
  </script>
  <script>
    ${buildLikeScript(resolvedCollectionName, likeRecordsData)}
    ${template.js || ""}
  </script>
</body>
</html>`;

  return { srcDoc, minHeight: config["min-height"] };
};