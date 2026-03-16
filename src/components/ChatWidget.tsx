// ChatWidget.tsx  (REFACTORED)
// ─────────────────────────────────────────────────────────────────────────────
// What changed vs original:
//   • TabNavigation component    → renderTabButtons() helper removed (was called twice)
//   • AgentAvatar component      → agent image/fallback SVG in 4 places → 1 component
//   • SocialIconsList component  → social icons rendered in 2 places → 1 component
//   • ContactInfo component      → phone/email in 2 modes → 1 component
//   • LoadingSpinner component   → inline spinner JSX → 1 component
//   • useCollectionActionStates  → handleFeaturedLikeToggle/ShareClick/postMessage
//   • useImpressionTracking      → entire impression tracking effect (~100 lines)
//   • FeaturedSlider             → unchanged (uses common components via props)
// All socket/session/message logic is untouched.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useAgentDetails } from "../hooks/useAgentDetails";
import { useWebSocket } from "../hooks/useWebSocket";
import ChatHistoryList from "./ChatHistoryList";
import ChatCollectionsScreen from "./ChatCollectionsScreen";
import { buildCollectionRecordIframeDoc } from "../utils/collections";
import { buildCollectionIframeDoc } from "../utils/collections";
import { Copy, ChevronDown } from "lucide-react";
import type {
  Message,
  AgentData,
  CollectionEntry,
  CollectionTemplate,
} from "../types/index.ts";
import { getBackendSessionId, setBackendSessionId } from "../utils/storage";
import { buildSocketUrl } from "../services/widget";
import { generateUUID } from "../utils/uuid";
import { getDomainInfo } from "../utils/domain";
import { useVisitor } from "../contexts/VisitorContext";
import {
  fetchCollectionHtml,
  loadCollectionAssets,
  fetchFeaturedRecords,
  fetchLikesHistory,
} from "../services/api";
import { WIDGET_DOMAIN } from "../config/constants";
import {
  CollectionRecordCard,
  type RecordActionState,
} from "./common/Collectioncard.tsx";

import AgentAvatar from "./common/AgentAvtar.tsx";
import SocialIconsList from "./common/SocialIconlist.tsx";
import ContactInfo from "./common/ContactInfo";
import LoadingSpinner from "./common/LoadingSpinner";
import TabNavigation from "./common/TabNavigation";
import type { TabItem } from "./common/TabNavigation";

import { useCollectionActionStates } from "../hooks/useCollectionActionstates";
import { useImpressionTracking } from "../hooks/useImpressiontracking";

import "../styles.scss";
import { renderMathInHtml } from "../utils/katex";


// ── FeaturedCollection type ───────────────────────────────────────────────────
type FeaturedCollection = {
  collectionName: string;
  records: any[];
  isOpen: boolean;
  isLoading: boolean;
};

const extractSessionIdFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("session_id");
  } catch {
    return null;
  }
};

const extractLikeCount = (rec: any): number =>
  rec?.like_count ??
  rec?.likes ??
  rec?.stats?.likes ??
  rec?.stats?.ALL?.likes ??
  rec?.stats?.GLOBAL?.likes ??
  0;

const extractViewCount = (rec: any): number =>
  rec?.view_count ??
  rec?.views ??
  rec?.stats?.impressions ??
  rec?.stats?.ALL?.impressions ??
  rec?.stats?.GLOBAL?.impressions ??
  rec?.stats?.views ??
  rec?.stats?.ALL?.views ??
  rec?.stats?.GLOBAL?.views ??
  0;

const extractShareCount = (rec: any): number =>
  rec?.share_count ??
  rec?.shares ??
  rec?.stats?.shares ??
  rec?.stats?.ALL?.shares ??
  rec?.stats?.GLOBAL?.shares ??
  0;

// ── Prev/Next slider icons ────────────────────────────────────────────────────
const PrevIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const NextIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── FeaturedSlider ─────────────────────────────────────────────────────────────
// (Unchanged — already uses CollectionRecordCard. Props remain the same.)
const FeaturedSlider = ({
  collectionName,
  records,
  template,
  featuredActionStates,
  featuredIframeRefs,
  featuredRecordCollectionMap,
  featuredRecordUrlMap,
  featuredScrollContainerRefs,
  onLikeToggle,
  onShareClick,
  onCardClick,
}: {
  collectionName: string;
  records: any[];
  template: CollectionTemplate;
  featuredActionStates: Record<string, RecordActionState>;
  featuredIframeRefs: React.MutableRefObject<
    Record<string, HTMLIFrameElement | null>
  >;
  featuredRecordCollectionMap: React.MutableRefObject<Record<string, string>>;
  featuredRecordUrlMap: React.MutableRefObject<Record<string, string>>;
  featuredScrollContainerRefs: React.MutableRefObject<
    Record<string, HTMLDivElement | null>
  >;
  onLikeToggle: (recordId: string) => void;
  onShareClick: (recordId: string) => void;
  onCardClick: (recordId: string) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const firstCardFrameWidth = useMemo(() => {
    if (!records.length || !template?.html) return 0;
    const iframeDoc = buildCollectionRecordIframeDoc(records[0], template, 0);
    const fw = iframeDoc.frameWidth;
    return typeof fw === "string" ? parseFloat(fw) : (fw as number);
  }, [records, template]);

  const scrollTrackWidth = useMemo(() => {
    if (!firstCardFrameWidth) return "100%";
    return firstCardFrameWidth * 2 + 8;
  }, [firstCardFrameWidth]);

  const updateNavState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    featuredScrollContainerRefs.current[collectionName] = el;
    el.addEventListener("scroll", updateNavState, { passive: true });
    updateNavState();
    return () => {
      el.removeEventListener("scroll", updateNavState);
    };
  }, [collectionName, featuredScrollContainerRefs]);

  const scrollBy = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = (firstCardFrameWidth || 180) + 8;
    el.scrollBy({
      left: dir === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (!template || !template.html) return null;

  const navBtnStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "50%",
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    color: "#5d5fef",
    padding: 0,
  };

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      {canPrev && (
        <button
          type="button"
          onClick={() => scrollBy("prev")}
          style={{ ...navBtnStyle, left: 0 }}
          aria-label="Previous"
        >
          <PrevIcon />
        </button>
      )}
      <div
        style={{ width: scrollTrackWidth, maxWidth: "100%", margin: "0 auto" }}
      >
        <div
          ref={(el) => {
            scrollRef.current = el;
            featuredScrollContainerRefs.current[collectionName] = el;
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            overflowX: "auto",
            gap: "8px",
            paddingBottom: "4px",
            width: "100%",
            boxSizing: "border-box",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="featured-slider-track"
       
        >
          {records.map((record, index) => {
            const iframeDoc = buildCollectionRecordIframeDoc(
              record,
              template,
              index,
            );
            const recordId = iframeDoc.recordId;
            const actionState = featuredActionStates[recordId] ?? {
              likeCount: iframeDoc.initialLikeCount,
              viewCount: iframeDoc.initialViewCount,
              shareCount: iframeDoc.initialShareCount,
              isLiked: false,
            };
            return (
              <CollectionRecordCard
                key={`${collectionName}-${index}`}
                record={record}
                template={template}
                recordIndex={index}
                recordId={recordId}
                actionState={actionState}
                layout="horizontal"
                iframeRefs={featuredIframeRefs}
                recordCollectionMap={featuredRecordCollectionMap}
                recordUrlMap={featuredRecordUrlMap}
                onLikeToggle={onLikeToggle}
                onShareClick={onShareClick}
                onCardClick={onCardClick}
              />
            );
          })}
        </div>
      </div>
      {canNext && (
        <button
          type="button"
          onClick={() => scrollBy("next")}
          style={{ ...navBtnStyle, right: 0 }}
          aria-label="Next"
        >
          <NextIcon />
        </button>
      )}
    </div>
  );
};

// ── ChatWidget Props ──────────────────────────────────────────────────────────
interface ChatWidgetProps {
  agentId: string;
  userId?: string;
  socketUrl?: string;
  batchId?: string;
  agentData?: AgentData;
}

const SUPPORTED_SOCIAL_TYPES = new Set([
  "facebook",
  "linkedin",
  "twitter",
  "instagram",
  "youtube",
]);

// ── Tab Icons ─────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
  >
    <g clipPath="url(#clip0_home)">
      <path
        d="M14.625 6.49499C14.6246 6.49465 14.6242 6.49419 14.6239 6.49385L8.50505 0.375253C8.24424 0.114327 7.89748 -0.0292969 7.52864 -0.0292969C7.1598 -0.0292969 6.81304 0.114327 6.55211 0.375253L0.436494 6.49076C0.434434 6.49282 0.43226 6.49499 0.430314 6.49705C-0.105271 7.03573 -0.104355 7.90971 0.432946 8.44702C0.678422 8.69261 1.00252 8.83474 1.34916 8.84973C1.36335 8.85111 1.37754 8.85179 1.39185 8.85179H1.63561V13.3546C1.63561 14.2457 2.36071 14.9707 3.25186 14.9707H5.64574C5.88847 14.9707 6.08519 14.7739 6.08519 14.5313V11.001C6.08519 10.5944 6.41604 10.2637 6.82265 10.2637H8.23463C8.64124 10.2637 8.97197 10.5944 8.97197 11.001V14.5313C8.97197 14.7739 9.1687 14.9707 9.41143 14.9707H11.8053C12.6966 14.9707 13.4216 14.2457 13.4216 13.3546V8.85179H13.6477C14.0164 8.85179 14.3632 8.70817 14.6242 8.44713C15.1621 7.90903 15.1623 7.03344 14.625 6.49499Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_home">
        <rect width="15" height="15" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const ChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
  >
    <g clipPath="url(#clip0_chat)">
      <mask
        id="mask0_chat"
        style={{ maskType: "luminance" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="15"
        height="15"
      >
        <path d="M15 0H0V15H15V0Z" fill="white" />
      </mask>
      <g mask="url(#mask0_chat)">
        <path
          d="M7.5 0.585938C3.68147 0.585938 0.585938 3.68148 0.585938 7.5C0.585938 8.84429 0.96999 10.0987 1.63377 11.1603L0.585938 14.4141L3.83974 13.3662C4.90131 14.03 6.15571 14.4141 7.5 14.4141C11.3185 14.4141 14.4141 11.3185 14.4141 7.5C14.4141 3.68148 11.3185 0.585938 7.5 0.585938Z"
          stroke="currentColor"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.23242 7.5C8.23242 7.9045 7.9045 8.23242 7.5 8.23242C7.0955 8.23242 6.76758 7.9045 6.76758 7.5C6.76758 7.0955 7.0955 6.76758 7.5 6.76758C7.9045 6.76758 8.23242 7.0955 8.23242 7.5Z"
          fill="currentColor"
        />
        <path
          d="M11.1621 7.5C11.1621 7.9045 10.8342 8.23242 10.4297 8.23242C10.0252 8.23242 9.69727 7.9045 9.69727 7.5C9.69727 7.0955 10.0252 6.76758 10.4297 6.76758C10.8342 6.76758 11.1621 7.0955 11.1621 7.5Z"
          fill="currentColor"
        />
        <path
          d="M5.30273 7.5C5.30273 7.9045 4.97481 8.23242 4.57031 8.23242C4.16581 8.23242 3.83789 7.9045 3.83789 7.5C3.83789 7.0955 4.16581 6.76758 4.57031 6.76758C4.97481 6.76758 5.30273 7.0955 5.30273 7.5Z"
          fill="currentColor"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_chat">
        <rect width="15" height="15" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const HistoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
  >
    <g clipPath="url(#clip0_history)">
      <path
        d="M7.43203 8.11172L10.2445 10.2211C10.4517 10.3765 10.7454 10.3345 10.9008 10.1273C11.0562 9.92016 11.0142 9.62648 10.807 9.47109L8.20312 7.5V3.51563C8.20312 3.25664 7.99336 3.04688 7.73438 3.04688C7.47539 3.04688 7.26562 3.25664 7.26562 3.51563V7.73438C7.26562 7.89 7.33078 8.03016 7.43203 8.11172Z"
        fill="currentColor"
      />
      <path
        d="M7.96877 0.46875C4.53775 0.46875 1.60783 2.94516 1.03596 6.32812L0.857832 6.06328C0.712754 5.84836 0.421192 5.79164 0.20627 5.93672C-0.00865196 6.0818 -0.0653707 6.37336 0.0797074 6.58828L1.01721 7.99453C1.09432 8.11172 1.21994 8.18836 1.3594 8.20312H1.40627C1.53049 8.20266 1.64932 8.15297 1.73674 8.06484L2.90861 6.89297C3.09166 6.70992 3.09166 6.41273 2.90861 6.22969C2.72557 6.04664 2.42838 6.04664 2.24533 6.22969L1.95471 6.52266C2.49447 3.20062 5.62502 0.945469 8.94682 1.48523C12.2686 2.025 14.5242 5.15531 13.9845 8.47734C13.5052 11.4272 10.9573 13.5942 7.96877 13.5938C6.08393 13.628 4.30127 12.7388 3.19455 11.2125C3.04432 11.0016 2.75158 10.9521 2.54064 11.1023C2.32971 11.2526 2.28025 11.5453 2.43049 11.7563C3.71205 13.5309 5.78018 14.5671 7.96877 14.5312C11.8521 14.5312 15 11.3834 15 7.5C15 3.61664 11.8521 0.46875 7.96877 0.46875Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_history">
        <rect width="15" height="15" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// ── ChatWidget Main Component ─────────────────────────────────────────────────
export default function ChatWidget({
  agentId,
  socketUrl,
  userId,
  batchId,
  agentData: initialAgentData,
}: ChatWidgetProps) {
  const [input, setInput] = useState("");
  const [collectionSearchInput, setCollectionSearchInput] = useState("");
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null,
  );
  const [copiedSuggestionKey, setCopiedSuggestionKey] = useState<string | null>(
    null,
  );
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);

  const [featuredCollections, setFeaturedCollections] = useState<
    FeaturedCollection[]
  >([]);

  const featuredIframeRefs = useRef<Record<string, HTMLIFrameElement | null>>(
    {},
  );
  const featuredRecordCollectionMap = useRef<Record<string, string>>({});
  const featuredRecordUrlMap = useRef<Record<string, string>>({});
  const featuredScrollContainerRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  const [homeImpressionKey, setHomeImpressionKey] = useState(0);
  const [expandedFeaturedCollections, setExpandedFeaturedCollections] =
    useState<Set<string>>(new Set());

  // ✅ Common hook: replaces 3 handlers + postMessage useEffect (~60 lines)
  const {
    actionStates: featuredActionStates,
    setActionStates: setFeaturedActionStates,
    handleLikeToggle: handleFeaturedLikeToggle,
    handleShareClick: handleFeaturedShareClick,
  } = useCollectionActionStates({
    iframeRefs: featuredIframeRefs,
    recordCollectionMap: featuredRecordCollectionMap,
    recordUrlMap: featuredRecordUrlMap,
  });

  // Card click → open URL (featured only, not in common hook as it's widget-specific)
  const handleFeaturedCardClick = useCallback((recordId: string) => {
    const recordUrl = featuredRecordUrlMap.current[recordId] ?? "";
    if (recordUrl && recordUrl !== "#") {
      window.open(recordUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "chat" | "history">(
    "home",
  );
  const [activeChatView, setActiveChatView] = useState<"chat" | "collection">(
    "chat",
  );
  const [collectionOriginTab, setCollectionOriginTab] = useState<
    "home" | "chat" | null
  >(null);
  const [collectionTemplates, setCollectionTemplates] = useState<
    CollectionTemplate[]
  >([]);
  const [collectionTemplatesLoading, setCollectionTemplatesLoading] =
    useState(false);
  const [collectionTemplatesError, setCollectionTemplatesError] = useState<
    string | null
  >(null);

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const homeInputRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottomRef = useRef(true);
  const shouldAutoScrollRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const disconnectAfterResponseWhenClosedRef = useRef(false);
  const { visitorId } = useVisitor();

  useEffect(() => {
    if (!isFullscreen) setIsSidebarOpen(true);
  }, [isFullscreen]);

  const { agentData } = useAgentDetails(userId, agentId, initialAgentData);
  const resolvedDomain = agentData.domain || getDomainInfo().currentDomain;

  const socialIconBaseUrl = useMemo(() => {
    if (!WIDGET_DOMAIN) return "";
    return WIDGET_DOMAIN.endsWith("/") ? WIDGET_DOMAIN : `${WIDGET_DOMAIN}/`;
  }, []);

  const socialLinks = useMemo(() => {
    return (agentData.social_media ?? [])
      .map((social) => ({
        ...social,
        type: (social.type || "").toLowerCase().trim(),
        link: social.link?.trim() || "",
      }))
      .filter(
        (social) =>
          social.type && social.link && SUPPORTED_SOCIAL_TYPES.has(social.type),
      )
      .slice(0, 5);
  }, [agentData.social_media]);

  const defaultQuestions =
    agentData.conversation_starters?.length > 0
      ? agentData.conversation_starters
      : [];

  // ── Load collection templates ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !batchId) return;
    let cancelled = false;
    const loadTemplates = async () => {
      setCollectionTemplatesLoading(true);
      setCollectionTemplatesError(null);
      try {
        const response = await fetchCollectionHtml({
          user_uuid: userId,
          batch_id: batchId,
        });
        const templates = (response.data || []).filter(
          (item) => item.html_s3_url,
        );
        const hydrated = await loadCollectionAssets(templates);
        if (!cancelled) setCollectionTemplates(hydrated);
      } catch (error) {
        if (!cancelled)
          setCollectionTemplatesError("Failed to load collection templates.");
      } finally {
        if (!cancelled) setCollectionTemplatesLoading(false);
      }
    };
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [userId, batchId]);

  const collectionTemplateMap = useMemo(() => {
    const map = new Map<string, CollectionTemplate>();
    collectionTemplates.forEach((template) => {
      if (template.mongo_db_rag_collection_name)
        map.set(template.mongo_db_rag_collection_name, template);
    });
    return map;
  }, [collectionTemplates]);

  const availableCollections = useMemo(() => {
    const templateNames = new Set(
      collectionTemplates
        .map((t) => t.mongo_db_rag_collection_name)
        .filter((name): name is string => Boolean(name)),
    );
    const agentCollections = agentData.mongo_db_rag_collection_name || [];
    if (agentCollections.length) return agentCollections;
    return Array.from(templateNames);
  }, [agentData.mongo_db_rag_collection_name, collectionTemplates]);

  // ── Initialize featured collections ──────────────────────────────────────
  useEffect(() => {
    if (!availableCollections.length) return;
    setFeaturedCollections(
      availableCollections.map((name) => ({
        collectionName: name,
        records: [],
        isOpen: false,
        isLoading: false,
      })),
    );
  }, [availableCollections]);

  // ── Auto-fetch featured collections ──────────────────────────────────────
  useEffect(() => {
    if (!featuredCollections.length) return;
    featuredCollections.forEach((fc) => {
      if (!fc.records.length && !fc.isLoading)
        void toggleFeaturedCollection(fc.collectionName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    featuredCollections.length > 0 && featuredCollections[0]?.collectionName,
  ]);

  // ── Stable record IDs for impression tracking dep ─────────────────────────
  const featuredRecordIds = useMemo(() => {
    return featuredCollections
      .flatMap((fc) => fc.records.map((r: any) => r?._id ?? r?.id ?? ""))
      .filter(Boolean)
      .sort()
      .join(",");
  }, [featuredCollections]);

  // ✅ Common hook: replaces entire ~100 line impression tracking useEffect
  useImpressionTracking({
    mode: "multi",
    containerRefs: featuredScrollContainerRefs,
    collections: featuredCollections,
    trackingKey: `${featuredRecordIds}-${homeImpressionKey}`,
    setActionStates: setFeaturedActionStates,
  });

  // ── Fetch featured records ────────────────────────────────────────────────
  const toggleFeaturedCollection = async (collectionName: string) => {
    const existing = featuredCollections.find(
      (fc) => fc.collectionName === collectionName,
    );
    if (!existing || existing.records.length > 0 || existing.isLoading) return;

    setFeaturedCollections((prev) =>
      prev.map((fc) =>
        fc.collectionName === collectionName ? { ...fc, isLoading: true } : fc,
      ),
    );

    try {
      const token = (window as any).WEBMAP_WIDGET_CONFIG?.tokenId;
      if (!token) {
        setFeaturedCollections((prev) =>
          prev.map((fc) =>
            fc.collectionName === collectionName
              ? { ...fc, isLoading: false }
              : fc,
          ),
        );
        return;
      }

      const json = await fetchFeaturedRecords(collectionName, token);
      const jsonAny = json as any;
      const records: any[] = Array.isArray(jsonAny.data?.featuredRecords)
        ? jsonAny.data.featuredRecords
        : Array.isArray(jsonAny.data)
          ? jsonAny.data
          : [];

      const template = collectionTemplateMap.get(collectionName);
      const initialStates: Record<string, RecordActionState> = {};
      const rawIdToRecordId: Record<string, string> = {};
      const rawRecordIds: string[] = [];

      records.forEach((rec: any, index: number) => {
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
        featuredRecordCollectionMap.current[recordId] =
          rec?.collection_name ?? rec?.collection ?? collectionName;
        featuredRecordUrlMap.current[recordId] =
          rec?.url ?? rec?.link ?? rec?.page_url ?? rec?.website ?? "";
        initialStates[recordId] = {
          likeCount: extractLikeCount(rec),
          viewCount: extractViewCount(rec),
          shareCount: extractShareCount(rec),
          isLiked: false,
        };
      });

      let localVisitorId = "";
      try {
        localVisitorId = localStorage.getItem("bv_visitor_id") ?? "";
        if (!localVisitorId) {
          localVisitorId =
            "v_" +
            Math.random().toString(36).slice(2) +
            Date.now().toString(36);
          localStorage.setItem("bv_visitor_id", localVisitorId);
        }
      } catch {
        /* ignore */
      }

      const resolvedUserId = userId || localVisitorId;
      const isVisitor = !userId;

      const likesRes = rawRecordIds.length
        ? await fetchLikesHistory({
            collection_name: collectionName,
            records: rawRecordIds,
            id: resolvedUserId,
            is_visitor: isVisitor,
          }).catch((err) => {
            console.error("[FEATURED_LIKES_HISTORY]", err);
            return null;
          })
        : null;

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

      setFeaturedCollections((prev) =>
        prev.map((fc) =>
          fc.collectionName === collectionName
            ? { ...fc, records, isLoading: false }
            : fc,
        ),
      );
      setFeaturedActionStates((prev) => ({ ...prev, ...mergedStates }));
    } catch (err) {
      console.error("[FEATURED_RECORDS]", err);
      setFeaturedCollections((prev) =>
        prev.map((fc) =>
          fc.collectionName === collectionName
            ? { ...fc, isLoading: false }
            : fc,
        ),
      );
    }
  };

  // ── Description truncation ────────────────────────────────────────────────
  useEffect(() => {
    const checkTruncation = () => {
      const element = descriptionRef.current;
      if (!element || !agentData.description) {
        setIsTruncated(false);
        return;
      }
      setIsTruncated(element.scrollHeight - element.clientHeight > 2);
    };
    const timeouts: number[] = [];
    checkTruncation();
    timeouts.push(
      window.setTimeout(checkTruncation, 50),
      window.setTimeout(checkTruncation, 200),
      window.setTimeout(checkTruncation, 400),
    );
    let observer: ResizeObserver | null = null;
    if (descriptionRef.current) {
      observer = new ResizeObserver(checkTruncation);
      observer.observe(descriptionRef.current);
    }
    window.addEventListener("resize", checkTruncation);
    return () => {
      window.removeEventListener("resize", checkTruncation);
      timeouts.forEach((id) => clearTimeout(id));
      if (observer) observer.disconnect();
    };
  }, [agentData.description, isOpen, activeTab]);

  useEffect(() => {
    if (activeTab !== "chat" && activeChatView !== "chat")
      setActiveChatView("chat");
  }, [activeTab, activeChatView]);

  useEffect(() => {
    if (isOpen && activeTab === "home") setHomeImpressionKey((k) => k + 1);
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (activeChatView !== "chat") setShowScrollToBottom(false);
  }, [activeChatView]);

  useEffect(() => {
    const resize = () => {
      resizeTextarea(chatInputRef.current);
      resizeTextarea(homeInputRef.current);
    };
    requestAnimationFrame(resize);
  }, [input, collectionSearchInput, activeChatView, activeTab]);

  const {
    messages,
    isLoading,
    sendMessage,
    closeConnection,
    initialResponse,
    startNewSession,
    activeSessionId: activeSocketSessionId,
  } = useWebSocket(socketUrl, agentData.milvus_collection, agentId, {
    batchId,
    userUuid: userId,
    visitorId,
    domain: resolvedDomain,
    collectionNames: agentData.mongo_db_rag_collection_name,
  });

  const backendSessionId = getBackendSessionId();

  const collectionSessionId = useMemo(() => {
    if (activeSocketSessionId && activeSocketSessionId !== "default")
      return activeSocketSessionId;
    return extractSessionIdFromUrl(socketUrl) || backendSessionId;
  }, [activeSocketSessionId, backendSessionId, socketUrl]);

  useEffect(() => {
    if (!disconnectAfterResponseWhenClosedRef.current) return;
    if (isOpen) {
      disconnectAfterResponseWhenClosedRef.current = false;
      return;
    }
    if (!isLoading) {
      disconnectAfterResponseWhenClosedRef.current = false;
      void closeConnection();
    }
  }, [closeConnection, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "chat" || activeChatView !== "chat") return;
    const messagesEl = messagesContainerRef.current;
    if (!messagesEl) return;
    const updateScrollState = () => {
      const distanceFromBottom =
        messagesEl.scrollHeight -
        messagesEl.scrollTop -
        messagesEl.clientHeight;
      isAtBottomRef.current = distanceFromBottom <= 32;
      setShowScrollToBottom(!isAtBottomRef.current);
    };
    updateScrollState();
    messagesEl.addEventListener("scroll", updateScrollState, { passive: true });
    return () => messagesEl.removeEventListener("scroll", updateScrollState);
  }, [activeChatView, activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "chat" || activeChatView !== "chat") return;
    if (shouldAutoScrollRef.current || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldAutoScrollRef.current = false;
    }
  }, [messages, initialResponse, isLoading, activeChatView, activeTab, isOpen]);

  const scrollToBottom = () => {
    shouldAutoScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildNewSessionSocketUrl = (): string | null => {
    const widgetConfig = (window as any).WEBMAP_WIDGET_CONFIG;
    const tokenId = widgetConfig?.tokenId;
    const resolvedVisitorId =
      visitorId || localStorage.getItem("webmap_visitor_id");
    if (!tokenId || !userId || !resolvedVisitorId) return null;
    const newSessionId = generateUUID();
    setBackendSessionId(newSessionId);
    return buildSocketUrl(
      agentId,
      userId,
      newSessionId,
      tokenId,
      resolvedVisitorId,
      resolvedDomain,
    );
  };

  const prepareNewSessionFromHome = async () => {
    if (activeTab !== "home") return;
    const hasExistingConversation = messages.length > 0;
    if (hasExistingConversation) {
      const freshSocketUrl = buildNewSessionSocketUrl();
      if (freshSocketUrl) {
        await startNewSession({
          socketUrl: freshSocketUrl,
          sessionId: extractSessionIdFromUrl(freshSocketUrl) || undefined,
          resetState: true,
          connect: true,
          terminateOthers: true,
        });
      }
    } else {
      await startNewSession({
        sessionId:
          activeSocketSessionId ||
          extractSessionIdFromUrl(socketUrl) ||
          undefined,
        resetState: true,
        terminateOthers: true,
      });
    }
  };

  const toggleSection = (messageIndex: number, section: string) => {
    const key = `${messageIndex}-${section}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    const computed = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 20;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * 4 + paddingTop + paddingBottom + borderTop + borderBottom;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const handleTextareaKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    submit: () => void,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  const handleChatViewToggle = (view: "chat" | "collection") => {
    if (view === "collection") {
      if (activeTab === "home" || activeTab === "chat")
        setCollectionOriginTab(activeTab);
      setActiveChatView("collection");
      if (activeTab !== "chat") setActiveTab("chat");
      return;
    }
    if (activeChatView === "chat" && !collectionOriginTab) return;
    setActiveChatView("chat");
    if (collectionOriginTab === "home") setActiveTab("home");
    else if (activeTab !== "chat") setActiveTab("chat");
    setCollectionOriginTab(null);
  };

  const handleHomeInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    resizeTextarea(event.currentTarget);
  };

  const handleChatInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (activeChatView === "collection")
      setCollectionSearchInput(event.target.value);
    else setInput(event.target.value);
    resizeTextarea(event.currentTarget);
  };

  const handleCollectionSearch = () =>
    setCollectionSearchQuery(collectionSearchInput.trim());

  const handleSendMessage = async () => {
    if (isLoading || !input.trim()) return;
    setActiveChatView("chat");
    setCollectionOriginTab(null);
    disconnectAfterResponseWhenClosedRef.current = false;
    shouldAutoScrollRef.current = true;
    if (activeTab === "home") await prepareNewSessionFromHome();
    else if (activeTab === "chat" && messages.length === 0) {
      await startNewSession({
        sessionId:
          activeSocketSessionId ||
          extractSessionIdFromUrl(socketUrl) ||
          undefined,
        connect: true,
        terminateOthers: false,
      });
    }
  
    // sendMessage(renderMathInHtml(input));
  
    sendMessage(input);
console.log("m.text will be:", input); // ← add this
    setInput("");
    setActiveTab("chat");
  };

  
  const handleInputSubmit = () => {
    if (activeChatView === "collection") {
      handleCollectionSearch();
      return;
    }
    void handleSendMessage();
  };

  const handleQuestionClick = async (question: string) => {
    if (isLoading || isSendingQuestion) return;
    setIsSendingQuestion(true);
    setActiveChatView("chat");
    setCollectionOriginTab(null);
    disconnectAfterResponseWhenClosedRef.current = false;
    shouldAutoScrollRef.current = true;
    if (activeTab === "home") await prepareNewSessionFromHome();
    sendMessage(question);
    // sendMessage(renderMathInHtml(question));
    setActiveTab("chat");
    setIsSendingQuestion(false);
  };

  const handleChatClose = () => {
    if (isOpen) {
      if (isLoading) disconnectAfterResponseWhenClosedRef.current = true;
      setIsOpen(false);
      return;
    }
    disconnectAfterResponseWhenClosedRef.current = false;
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isLoading) disconnectAfterResponseWhenClosedRef.current = true;
    else {
      disconnectAfterResponseWhenClosedRef.current = false;
      closeConnection();
    }
    setIsOpen(false);
    setIsFullscreen(false);
    setActiveTab("home");
  };

  const handleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleCopyMessage = (htmlText: string, messageIndex: number) => {
    const plainText = htmlText.replace(/<[^>]*>/g, "");
    navigator.clipboard
      .writeText(plainText)
      .then(() => {
        setCopiedMessageIndex(messageIndex);
        setTimeout(() => setCopiedMessageIndex(null), 2000);
      })
      .catch((err) => console.error("❌ Failed to copy:", err));
  };

  const handleCopySuggestedPrompt = (text: string, key: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedSuggestionKey(key);
        setTimeout(() => setCopiedSuggestionKey(null), 2000);
      })
      .catch((err) => console.error("Failed to copy:", err));
  };

  const renderCollectionIframe = (
    collection: CollectionEntry,
    index: number,
  ) => {
    const template = collectionTemplateMap.get(collection.collectionKey);
    if (!template || !template.html) {
      return (
        <div
          key={`${collection.collectionKey}-${index}`}
          className="collection-missing"
        >
          {collectionTemplatesLoading
            ? "Loading collection templates..."
            : "Collection template unavailable."}
        </div>
      );
    }
    const { srcDoc, minHeight } = buildCollectionIframeDoc(
      collection.records,
      template,
    );
    return (
      <iframe
        key={`${collection.collectionKey}-${index}`}
        className="collection-iframe"
        sandbox="allow-scripts allow-same-origin allow-popups"
        title={`Product collection ${collection.collectionKey}`}
        style={{ minHeight }}
        srcDoc={srcDoc}
      />
    );
  };

  const buildSessionSocketUrl = (sessionId: string): string | null => {
    const widgetConfig = (window as any).WEBMAP_WIDGET_CONFIG;
    const tokenId = widgetConfig?.tokenId;
    const resolvedVisitorId =
      visitorId || localStorage.getItem("webmap_visitor_id");
    if (!tokenId || !userId || !resolvedVisitorId) return null;
    return buildSocketUrl(
      agentId,
      userId,
      sessionId,
      tokenId,
      resolvedVisitorId,
      resolvedDomain,
    );
  };

  const handleSessionSelect = async (
    sessionId: string,
    loadedMessages: Message[],
  ) => {
    setBackendSessionId(sessionId);
    const sessionSocketUrl = buildSessionSocketUrl(sessionId);
    await startNewSession({
      socketUrl: sessionSocketUrl ?? undefined,
      sessionId,
      preloadMessages: loadedMessages,
      connect: false,
    });
    shouldAutoScrollRef.current = true;
    setActiveTab("chat");
  };

  // ✅ Common: TabNavigation — tab items defined once, rendered in 2 places via component
  const tabItems: TabItem[] = [
    {
      key: "home",
      label: "Home",
      onClick: () => setActiveTab("home"),
      icon: <HomeIcon />,
    },
    {
      key: "chat",
      label: "Chat",
      onClick: () => {
        shouldAutoScrollRef.current = true;
        setActiveTab("chat");
      },
      icon: <ChatIcon />,
    },
    {
      key: "history",
      label: "History",
      onClick: () => setActiveTab("history"),
      icon: <HistoryIcon />,
    },
  ];

  // ── Chat view toggle buttons (reused in home + chat input areas) ──────────
  const renderChatViewToggle = () => (
    <div className="chat-action-toggle">
      <button
        type="button"
        className={`toggle-button ${activeChatView === "chat" ? "active" : ""}`}
        onClick={() => handleChatViewToggle("chat")}
        aria-label="Chat view"
        title="Chat"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.99997 0.500001C5.02946 0.499566 4.07614 0.756053 3.23688 1.2434C2.39761 1.73075 1.70232 2.43158 1.22164 3.27469C0.740973 4.11779 0.492057 5.07312 0.500193 6.04359C0.508329 7.01405 0.773226 7.96507 1.26797 8.8L0.530466 10.829C0.502986 10.9045 0.494108 10.9855 0.504583 11.0652C0.515058 11.1448 0.544578 11.2208 0.590642 11.2867C0.636707 11.3525 0.697959 11.4062 0.769211 11.4434C0.840463 11.4805 0.919616 11.4999 0.999966 11.5C1.05826 11.4999 1.1161 11.4897 1.17097 11.47L3.19997 10.732C3.92815 11.1634 4.74608 11.4209 5.59006 11.4845C6.43404 11.548 7.28131 11.416 8.06591 11.0986C8.8505 10.7811 9.55126 10.2869 10.1136 9.65439C10.676 9.02185 11.0848 8.26807 11.3082 7.45171C11.5316 6.63535 11.5635 5.77845 11.4016 4.94771C11.2397 4.11697 10.8882 3.33481 10.3745 2.66213C9.86089 1.98944 9.19892 1.44437 8.44017 1.06936C7.68141 0.694344 6.84634 0.499502 5.99997 0.500001Z"
            fill="none"
          />
        </svg>
      </button>
      <button
        type="button"
        className={`toggle-button ${activeChatView === "collection" ? "active" : ""}`}
        onClick={() => handleChatViewToggle("collection")}
        aria-label="Collection view"
        title="Collections"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="elem-fill"
            d="M3.6325 0H0.761466C0.341636 0 0.00012207 0.341514 0.00012207 0.761344V3.63238C0.00012207 4.05221 0.341636 4.39372 0.761466 4.39372H3.6325C4.05233 4.39372 4.39384 4.05221 4.39384 3.63238V0.761344C4.39378 0.341514 4.05233 0 3.6325 0Z"
            fill="#c9c9c9"
          />
          <path
            className="elem-fill"
            d="M9.2387 0H6.36767C5.94784 0 5.60632 0.341514 5.60632 0.761344V3.63238C5.60632 4.05221 5.94784 4.39372 6.36767 4.39372H9.2387C9.65853 4.39372 10 4.05221 10 3.63238V0.761344C10 0.341514 9.65853 0 9.2387 0Z"
            fill="#c9c9c9"
          />
          <path
            className="elem-fill"
            d="M3.63238 5.60938H0.761344C0.341514 5.60938 0 5.95086 0 6.37069V9.24172C0 9.66155 0.341514 10.0031 0.761344 10.0031H3.63238C4.05221 10.0031 4.39372 9.66155 4.39372 9.24172V6.37069C4.39365 5.95086 4.05221 5.60938 3.63238 5.60938Z"
            fill="#c9c9c9"
          />
          <path
            className="elem-fill"
            d="M9.2387 5.60938H6.36767C5.94784 5.60938 5.60632 5.95089 5.60632 6.37072V9.24175C5.60632 9.66158 5.94784 10.0031 6.36767 10.0031H9.2387C9.65853 10.0031 10 9.66155 10 9.24172V6.37069C10 5.95086 9.65853 5.60938 9.2387 5.60938Z"
            fill="#c9c9c9"
          />
        </svg>
      </button>
    </div>
  );

  // ── Send icon (reused in 2 input areas) ───────────────────────────────────
  const SendIcon = ({ idSuffix = "" }: { idSuffix?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <g clipPath={`url(#clip_send_${idSuffix})`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.4455 4.55418L6.16543 8.22008L0.642754 6.37894C0.257261 6.25018 -0.00244803 5.88851 -0.000230044 5.48218C0.00201713 5.07585 0.264703 4.71638 0.651684 4.59212L14.7713 0.0450911C15.1069 -0.0628025 15.4753 0.025742 15.7246 0.275062C15.9739 0.524381 16.0625 0.892743 15.9546 1.22839L11.4075 15.348C11.2833 15.735 10.9238 15.9976 10.5175 15.9999C10.1112 16.0021 9.74947 15.7424 9.62071 15.3569L7.77065 9.80746L11.4455 4.55418Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id={`clip_send_${idSuffix}`}>
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`chat-widget-container ${isFullscreen ? "fullscreen" : ""} ${isOpen ? "open" : ""}`}
    >
      {/* Chat Bubble */}
      <div
        className={`chat-bubble ${isOpen ? "open" : ""}`}
        onClick={handleChatClose}
      >
        {isOpen ? (
          <div className="bubble-icon arrow-down">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        ) : (
          <div className="bubble-icon">
            {/* ✅ Common: AgentAvatar */}
            <AgentAvatar
              src={agentData.publish_agent_profile}
              alt={agentData.title || "Chat"}
              size="bubble"
            />
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <>
          <div className={`chat-window ${isFullscreen ? "fullscreen" : ""}`}>
            {isFullscreen && (
              <aside
                className={`chat-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}
              >
                <div className="sidebar-header">
                  <button
                    type="button"
                    className="sidebar-toggle-btn"
                    onClick={() => setIsSidebarOpen((p) => !p)}
                    aria-label="Toggle sidebar"
                    aria-expanded={isSidebarOpen}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17.0859 6.66406C17.7763 6.66406 18.3359 6.10442 18.3359 5.41406C18.3359 4.72371 17.7763 4.16406 17.0859 4.16406C16.3956 4.16406 15.8359 4.72371 15.8359 5.41406C15.8359 6.10442 16.3956 6.66406 17.0859 6.66406Z"
                        fill="#5D5FEF"
                      />
                      <path
                        d="M13.7513 6.66406H2.91797C2.22789 6.66406 1.66797 6.10415 1.66797 5.41406C1.66797 4.72398 2.22789 4.16406 2.91797 4.16406H13.7513C14.4414 4.16406 15.0013 4.72398 15.0013 5.41406C15.0013 6.10415 14.4414 6.66406 13.7513 6.66406Z"
                        fill="#5D5FEF"
                      />
                      <path
                        d="M13.7513 11.6641H2.91797C2.22789 11.6641 1.66797 11.1041 1.66797 10.4141C1.66797 9.72398 2.22789 9.16406 2.91797 9.16406H13.7513C14.4414 9.16406 15.0013 9.72398 15.0013 10.4141C15.0013 11.1041 14.4414 11.6641 13.7513 11.6641Z"
                        fill="#5D5FEF"
                      />
                      <path
                        d="M8.7513 16.6641H2.91797C2.22789 16.6641 1.66797 16.1041 1.66797 15.4141C1.66797 14.724 2.22789 14.1641 2.91797 14.1641H8.7513C9.44139 14.1641 10.0013 14.724 10.0013 15.4141C10.0013 16.1041 9.44139 16.6641 8.7513 16.6641Z"
                        fill="#5D5FEF"
                      />
                    </svg>
                  </button>
                </div>
                {/* ✅ Common: TabNavigation (sidebar) */}
                <TabNavigation
                  tabs={tabItems}
                  activeTab={activeTab}
                  buttonClassName="sidebar-tab-button"
                  wrapperClassName="sidebar-nav"
                />
              </aside>
            )}

            <div className="chat-main">
              {/* Header */}
              <div className="header-bg">
                <div className="chat-header">
                  <div className="agent-info">
                    <div className="agent-avatar">
                      {/* ✅ Common: AgentAvatar */}
                      <AgentAvatar
                        src={agentData.publish_agent_profile}
                        alt={agentData.title}
                        size="header"
                      />
                    </div>
                    <div className="agent-details">
                      <div className="agent-name">
                        {agentData.title || "Chat-Agent"}
                      </div>
                    </div>
                  </div>
                  <div className="header-actions">
                    <button
                      className="fullscreen-btn"
                      onClick={handleFullscreen}
                    >
                      {/* Fullscreen icon — kept inline as it has two states */}
                      {isFullscreen ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                        >
                          <path
                            d="M1.45274 4.92907C1.70283 4.92907 1.90548 4.72636 1.90548 4.47633V2.54596L4.82143 5.46131C4.90987 5.54968 5.02571 5.59387 5.14155 5.59387C5.25745 5.59387 5.37335 5.54968 5.46173 5.46125C5.63854 5.28444 5.63854 4.99776 5.46167 4.82101L2.5456 1.9056H4.47638C4.72642 1.9056 4.92912 1.7029 4.92912 1.45286C4.92912 1.20283 4.72648 1.00012 4.47638 1.00012H1.45274C1.20265 1.00012 1 1.20283 1 1.45286V4.47639C1 4.72636 1.20265 4.92907 1.45274 4.92907Z"
                            fill="black"
                          />
                          <path
                            d="M13.5472 10.0664C13.2971 10.0664 13.0945 10.2691 13.0945 10.5191V12.4495L10.0888 9.44383C9.91189 9.26702 9.62527 9.26702 9.44846 9.44383C9.27165 9.62064 9.27165 9.90731 9.44846 10.0841L12.4541 13.0897H10.5238C10.2737 13.0897 10.0711 13.2924 10.0711 13.5425C10.0711 13.7925 10.2737 13.9952 10.5238 13.9952H13.5473C13.7974 13.9952 14 13.7925 14 13.5425V10.5191C14 10.2691 13.7972 10.0664 13.5472 10.0664Z"
                            fill="black"
                          />
                          <path
                            d="M4.91144 9.44383L1.90603 12.4495V10.5191C1.90603 10.2691 1.70338 10.0664 1.45329 10.0664C1.2032 10.0664 1.00055 10.2691 1.00055 10.5191V13.5426C1.00055 13.7926 1.2032 13.9953 1.45329 13.9953H4.47663C4.72667 13.9953 4.92937 13.7926 4.92937 13.5426C4.92937 13.2926 4.72673 13.0898 4.47663 13.0898H2.54627L5.55174 10.0841C5.72855 9.90726 5.72855 9.62058 5.55168 9.44377C5.37499 9.26702 5.08831 9.26702 4.91144 9.44383Z"
                            fill="black"
                          />
                          <path
                            d="M13.5469 1.00012H10.5235C10.2734 1.00012 10.0707 1.20283 10.0707 1.45286C10.0707 1.7029 10.2734 1.9056 10.5235 1.9056H12.4539L9.53836 4.82131C9.36155 4.99812 9.36155 5.2848 9.53842 5.46161C9.6268 5.54998 9.7427 5.59417 9.85854 5.59417C9.97438 5.59417 10.0903 5.54992 10.1787 5.46155L13.0942 2.54584V4.47632C13.0942 4.72636 13.2969 4.92907 13.547 4.92907C13.7971 4.92907 13.9997 4.72636 13.9997 4.47632V1.45286C13.9997 1.20277 13.797 1.00012 13.5469 1.00012Z"
                            fill="black"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                        >
                          <path
                            d="M1.45274 4.92907C1.70283 4.92907 1.90548 4.72636 1.90548 4.47633V2.54596L4.82143 5.46131C4.90987 5.54968 5.02571 5.59387 5.14155 5.59387C5.25745 5.59387 5.37335 5.54968 5.46173 5.46125C5.63854 5.28444 5.63854 4.99776 5.46167 4.82101L2.5456 1.9056H4.47638C4.72642 1.9056 4.92912 1.7029 4.92912 1.45286C4.92912 1.20283 4.72648 1.00012 4.47638 1.00012H1.45274C1.20265 1.00012 1 1.20283 1 1.45286V4.47639C1 4.72636 1.20265 4.92907 1.45274 4.92907Z"
                            fill="black"
                          />
                          <path
                            d="M13.5472 10.0664C13.2971 10.0664 13.0945 10.2691 13.0945 10.5191V12.4495L10.0888 9.44383C9.91189 9.26702 9.62527 9.26702 9.44846 9.44383C9.27165 9.62064 9.27165 9.90731 9.44846 10.0841L12.4541 13.0897H10.5238C10.2737 13.0897 10.0711 13.2924 10.0711 13.5425C10.0711 13.7925 10.2737 13.9952 10.5238 13.9952H13.5473C13.7974 13.9952 14 13.7925 14 13.5425V10.5191C14 10.2691 13.7972 10.0664 13.5472 10.0664Z"
                            fill="black"
                          />
                          <path
                            d="M4.91144 9.44383L1.90603 12.4495V10.5191C1.90603 10.2691 1.70338 10.0664 1.45329 10.0664C1.2032 10.0664 1.00055 10.2691 1.00055 10.5191V13.5426C1.00055 13.7926 1.2032 13.9953 1.45329 13.9953H4.47663C4.72667 13.9953 4.92937 13.7926 4.92937 13.5426C4.92937 13.2926 4.72673 13.0898 4.47663 13.0898H2.54627L5.55174 10.0841C5.72855 9.90726 5.72855 9.62058 5.55168 9.44377C5.37499 9.26702 5.08831 9.26702 4.91144 9.44383Z"
                            fill="black"
                          />
                          <path
                            d="M13.5469 1.00012H10.5235C10.2734 1.00012 10.0707 1.20283 10.0707 1.45286C10.0707 1.7029 10.2734 1.9056 10.5235 1.9056H12.4539L9.53836 4.82131C9.36155 4.99812 9.36155 5.2848 9.53842 5.46161C9.6268 5.54998 9.7427 5.59417 9.85854 5.59417C9.97438 5.59417 10.0903 5.54992 10.1787 5.46155L13.0942 2.54584V4.47632C13.0942 4.72636 13.2969 4.92907 13.547 4.92907C13.7971 4.92907 13.9997 4.72636 13.9997 4.47632V1.45286C13.9997 1.20277 13.797 1.00012 13.5469 1.00012Z"
                            fill="black"
                          />
                        </svg>
                      )}
                    </button>
                    <button className="close-btn" onClick={handleClose}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="17"
                        height="17"
                        viewBox="0 0 17 17"
                        fill="none"
                      >
                        <g clipPath="url(#clip0_close)">
                          <path
                            d="M11.1889 4.21205L8.46832 6.9933L5.68706 4.27272C5.27066 3.8654 4.60292 3.87276 4.1956 4.28917C3.78828 4.70557 3.79565 5.37331 4.21205 5.78063L6.9933 8.50121L4.27272 11.2825C3.8654 11.6989 3.87276 12.3666 4.28917 12.7739C4.70557 13.1812 5.37331 13.1739 5.78063 12.7575L8.50121 9.97623L11.2825 12.6968C11.6989 13.1041 12.3666 13.0968 12.7739 12.6804C13.1812 12.264 13.1739 11.5962 12.7575 11.1889L9.97623 8.46832L12.6968 5.68706C13.1041 5.27066 13.0968 4.60292 12.6804 4.1956C12.264 3.78828 11.5962 3.79565 11.1889 4.21205Z"
                            fill="black"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_close">
                            <rect
                              width="12"
                              height="12"
                              fill="white"
                              transform="translate(0 8.57833) rotate(-45.6318)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                    </button>
                  </div>
                </div>
                {/* ✅ Common: TabNavigation (bottom strip, compact mode only) */}
                {!isFullscreen && (
                  <div className="tab-navigation">
                    <TabNavigation tabs={tabItems} activeTab={activeTab} />
                  </div>
                )}
              </div>

              {/* ── Tab Content ── */}
              {activeTab === "home" ? (
                <div
                  className="chat-initial-screen"
                  style={{ overflowAnchor: "none" } as any}
                >
                  <div
                    className="initial-content"
                    style={
                      { overflowAnchor: "none",overflow: "visible" } as any
                    }
                  >
                    {isFullscreen ? (
                      // ── Fullscreen profile card ──────────────────────────────────────
                      <div className="agent-profile-card">
                        <div className="agent-profile-left">
                          <div className="agent-profile-header">
                            <div className="agent-profile-image-wrapper">
                              {/* ✅ Common: AgentAvatar */}
                              <AgentAvatar
                                src={agentData.publish_agent_profile}
                                alt={agentData.title}
                                size="profile"
                              />
                            </div>
                            <div className="agent-profile-text">
                              <h2 className="agent-profile-title">
                                {agentData.title || "AI Assistant"}
                              </h2>
                              <div className="agent-profile-description">
                                <p
                                  ref={descriptionRef}
                                  className="description-text"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      agentData?.description ??
                                      "Ask me anything! I'm here to help you find answers.",
                                  }}
                                />
                                {isTruncated && (
                                  <button
                                    className="read-more-link"
                                    onClick={() =>
                                      setShowDescriptionModal(true)
                                    }
                                  >
                                    more..
                                  </button>
                                )}
                              </div>
                              {/* ✅ Common: ContactInfo (list mode) */}
                              <ContactInfo
                                contactNumber={agentData.contact_number}
                                email={agentData.email}
                                mode="list"
                              />
                            </div>
                          </div>
                        </div>
                        {(socialLinks.length > 0 ||
                          agentData.custom_link?.link) && (
                          <div className="agent-profile-right">
                            {socialLinks.length > 0 && (
                              <div className="social-panel">
                                <div className="social-panel-title">
                                  Social Channels
                                </div>
                                {/* ✅ Common: SocialIconsList */}
                                <SocialIconsList
                                  socialLinks={socialLinks}
                                  iconBaseUrl={socialIconBaseUrl}
                                />
                              </div>
                            )}
                            {agentData.custom_link?.link && (
                              <a
                                href={agentData.custom_link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="custom-link-button custom-link-wide"
                              >
                                {agentData.custom_link.label || "Website"}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // ── Compact profile ───────────────────────────────────────────────
                      <>
                        <div className="agent-profile-header">
                          <div className="agent-profile-image-wrapper">
                            {/* ✅ Common: AgentAvatar */}
                            <AgentAvatar
                              src={agentData.publish_agent_profile}
                              alt={agentData.title}
                              size="profile"
                            />
                          </div>
                          <div className="agent-profile-info">
                            <h2 className="agent-profile-title">
                              {agentData.title || "AI Assistant"}
                            </h2>
                            {/* ✅ Common: SocialIconsList */}
                            <SocialIconsList
                              socialLinks={socialLinks}
                              iconBaseUrl={socialIconBaseUrl}
                            />
                          </div>
                        </div>
                        <div className="agent-profile-description">
                          <p
                            ref={descriptionRef}
                            className="description-text"
                            dangerouslySetInnerHTML={{
                              __html:
                                agentData?.description ??
                                "Ask me anything! I'm here to help you find answers.",
                            }}
                          />
                          {isTruncated && (
                            <button
                              className="read-more-link"
                              onClick={() => setShowDescriptionModal(true)}
                            >
                              more..
                            </button>
                          )}
                        </div>
                        <div className="agent-action-row">
                          {agentData.custom_link?.link && (
                            <a
                              href={agentData.custom_link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="custom-link-button"
                            >
                              {agentData.custom_link.label || "Website"}
                            </a>
                          )}
                          {/* ✅ Common: ContactInfo (buttons mode) */}
                          <ContactInfo
                            contactNumber={agentData.contact_number}
                            email={agentData.email}
                            mode="buttons"
                          />
                        </div>
                      </>
                    )}

                    {/* Conversation Starters */}
                    {defaultQuestions.length > 0 && (
                      <div className="conversation-starters">
                        {defaultQuestions.map((question, index) => (
                          <div
                            key={index}
                            className={`starter-card ${isLoading || isSendingQuestion ? "disabled" : ""}`}
                            onClick={() =>
                              !isLoading &&
                              !isSendingQuestion &&
                              handleQuestionClick(question)
                            }
                            role="button"
                            tabIndex={isLoading || isSendingQuestion ? -1 : 0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (!isLoading && !isSendingQuestion)
                                  handleQuestionClick(question);
                              }
                            }}
                          >
                            <p className="starter-text">{question}</p>
                            <div className="starter-icon">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <g clipPath="url(#clip0_starter)">
                                  <path
                                    d="M5.99997 0.500001C5.02946 0.499566 4.07614 0.756053 3.23688 1.2434C2.39761 1.73075 1.70232 2.43158 1.22164 3.27469C0.740973 4.11779 0.492057 5.07312 0.500193 6.04359C0.508329 7.01405 0.773226 7.96507 1.26797 8.8L0.530466 10.829C0.502986 10.9045 0.494108 10.9855 0.504583 11.0652C0.515058 11.1448 0.544578 11.2208 0.590642 11.2867C0.636707 11.3525 0.697959 11.4062 0.769211 11.4434C0.840463 11.4805 0.919616 11.4999 0.999966 11.5C1.05826 11.4999 1.1161 11.4897 1.17097 11.47L3.19997 10.732C3.92815 11.1634 4.74608 11.4209 5.59006 11.4845C6.43404 11.548 7.28131 11.416 8.06591 11.0986C8.8505 10.7811 9.55126 10.2869 10.1136 9.65439C10.676 9.02185 11.0848 8.26807 11.3082 7.45171C11.5316 6.63535 11.5635 5.77845 11.4016 4.94771C11.2397 4.11697 10.8882 3.33481 10.3745 2.66213C9.86089 1.98944 9.19892 1.44437 8.44017 1.06936C7.68141 0.694344 6.84634 0.499502 5.99997 0.500001Z"
                                    fill="#5D5FEF"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_starter">
                                    <rect width="12" height="12" fill="white" />
                                  </clipPath>
                                </defs>
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Featured Collections ── */}
                    {featuredCollections.length > 0 && (
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                          marginTop: "10px",
                          overflowAnchor: "none" as any,
                        }}
                      >
                        {featuredCollections.map((fc) => {
                          if (!fc.isLoading && fc.records.length === 0)
                            return null;
                          const template = collectionTemplateMap.get(
                            fc.collectionName,
                          );
                          const isCollectionExpanded =
                            expandedFeaturedCollections.has(fc.collectionName);
                          return (
                            <div key={fc.collectionName}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  const isCurrentlyExpanded =
                                    expandedFeaturedCollections.has(
                                      fc.collectionName,
                                    );
                                  setExpandedFeaturedCollections((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(fc.collectionName))
                                      next.delete(fc.collectionName);
                                    else next.add(fc.collectionName);
                                    return next;
                                  });
                                  if (!isCurrentlyExpanded) {
                                    setTimeout(() => {
                                      (
                                        e.currentTarget as HTMLElement
                                      ).scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                      });
                                    }, 50);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  background: "none",
                                  border: "none",
                                  padding: "0 0 8px 0",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                aria-expanded={isCollectionExpanded}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: "#374151",
                                    borderLeft: "3px solid #5d5fef",
                                    paddingLeft: "8px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                  }}
                                >
                                  Featured · {fc.collectionName}
                                </span>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#374151"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{
                                    flexShrink: 0,
                                    marginLeft: "6px",
                                    transform: isCollectionExpanded
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                    transition: "transform 0.2s",
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>

                              {isCollectionExpanded && (
                                <>
                                  {fc.isLoading && (
                                    // ✅ Common: LoadingSpinner
                                    <LoadingSpinner
                                      style={{ padding: "8px 0" }}
                                    />
                                  )}
                                  {!fc.isLoading &&
                                    fc.records.length > 0 &&
                                    template && (
                                      <FeaturedSlider
                                        collectionName={fc.collectionName}
                                        records={fc.records}
                                        template={template}
                                        featuredActionStates={
                                          featuredActionStates
                                        }
                                        featuredIframeRefs={featuredIframeRefs}
                                        featuredRecordCollectionMap={
                                          featuredRecordCollectionMap
                                        }
                                        featuredRecordUrlMap={
                                          featuredRecordUrlMap
                                        }
                                        featuredScrollContainerRefs={
                                          featuredScrollContainerRefs
                                        }
                                        onLikeToggle={handleFeaturedLikeToggle}
                                        onShareClick={handleFeaturedShareClick}
                                        onCardClick={handleFeaturedCardClick}
                                      />
                                    )}
                                  {!fc.isLoading &&
                                    fc.records.length > 0 &&
                                    !template && (
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          color: "#6b7280",
                                          padding: "8px 0",
                                          textAlign: "center",
                                        }}
                                      >
                                        {collectionTemplatesLoading
                                          ? "Loading template..."
                                          : "Template unavailable."}
                                      </div>
                                    )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Home input — outside scroll area so always visible */}
                  <div
                    className="chat-input-container"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  >
                    <div className="chat-input-field-wrap">
                      {renderChatViewToggle()}
                      <textarea
                        ref={homeInputRef}
                        rows={1}
                        value={input}
                        placeholder="Type your message here..."
                        disabled={isLoading}
                        onChange={handleHomeInputChange}
                        onKeyDown={(event) =>
                          handleTextareaKeyDown(event, () => {
                            void handleSendMessage();
                          })
                        }
                        className="chat-input-field"
                      />
                    </div>
                    <button
                      disabled={isLoading}
                      onClick={handleSendMessage}
                      className="send-button"
                    >
                      <SendIcon idSuffix="home" />
                    </button>
                  </div>
                </div>
              ) : activeTab === "chat" ? (
                <>
                  {activeChatView === "collection" ? (
                    <ChatCollectionsScreen
                      collectionNames={availableCollections}
                      collectionTemplateMap={collectionTemplateMap}
                      templatesLoading={collectionTemplatesLoading}
                      templatesError={collectionTemplatesError}
                      userId={userId}
                      sessionId={collectionSessionId}
                      searchQuery={collectionSearchQuery}
                    />
                  ) : (
                    <>
                      <div className="chat-messages" ref={messagesContainerRef}>
                        {messages.map((m, i) => {
                          const hasCollectionsSection =
                            m.type === "incoming" &&
                            (m.isCollectionLoading ||
                              m.collectionError ||
                              (m.collections && m.collections.length > 0));
                          const collectionSectionKey = `${i}-collections`;
                          const suggestionsSectionKey = `${i}-suggestions`;
                          const isCollectionExpanded = Boolean(
                            expandedSections[collectionSectionKey],
                          );
                          const isSuggestionsExpanded = Boolean(
                            expandedSections[suggestionsSectionKey],
                          );
                          return (
                            <div key={i} className="message-group">
                              <div className={`message-wrapper ${m.type}`}>
                                <div
                                  className={`message-bubble ${m.type} ${hasCollectionsSection ? "has-collections" : ""}`}
                                >
                                  {/* <div
                                    dangerouslySetInnerHTML={{
                                      __html: renderMathInHtml(m.text),
                                    }}
                                    className="message-text"
                                  /> */}

                                  { <div
                                    dangerouslySetInnerHTML={{
                                    __html: m.type === "incoming" ? m.text : renderMathInHtml(m.text),
                                    }}
                                    className="message-text"
                                  /> }
                                  {hasCollectionsSection && (
                                    <div className="collapsible-section collection-section">
                                      <div
                                        className="section-header"
                                        onClick={() =>
                                          toggleSection(i, "collections")
                                        }
                                      >
                                        <span className="section-title">
                                          Product Collections
                                        </span>
                                        {m.isCollectionLoading && (
                                          <span className="section-status">
                                            Loading...
                                          </span>
                                        )}
                                        <span
                                          className={`chevron ${isCollectionExpanded ? "open" : ""}`}
                                        >
                                          <ChevronDown size={14} />
                                        </span>
                                      </div>
                                      {isCollectionExpanded && (
                                        <div className="section-content collection-list">
                                          {collectionTemplatesError && (
                                            <div className="collection-error">
                                              {collectionTemplatesError}
                                            </div>
                                          )}
                                          {m.collectionError && (
                                            <div className="collection-error">
                                              {m.collectionError}
                                            </div>
                                          )}
                                          {m.isCollectionLoading &&
                                            (!m.collections ||
                                              m.collections.length === 0) && (
                                              <div className="collection-loading">
                                                Loading product collections...
                                              </div>
                                            )}
                                          {!m.isCollectionLoading &&
                                            !m.collectionError &&
                                            (!m.collections ||
                                              m.collections.length === 0) && (
                                              <div className="collection-empty">
                                                No product collections found.
                                              </div>
                                            )}
                                          {m.collections?.map(
                                            (collection, collectionIndex) =>
                                              renderCollectionIframe(
                                                collection,
                                                collectionIndex,
                                              ),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {m.suggestion_questions &&
                                    m.type === "incoming" && (
                                      <div className="collapsible-section">
                                        <div
                                          className="section-header"
                                          onClick={() =>
                                            toggleSection(i, "suggestions")
                                          }
                                        >
                                          <span className="section-title">
                                            Suggested Questions
                                          </span>
                                          <span
                                            className={`chevron ${isSuggestionsExpanded ? "open" : ""}`}
                                          >
                                            <ChevronDown size={14} />
                                          </span>
                                        </div>
                                        {isSuggestionsExpanded && (
                                          <div className="section-content suggestions-list">
                                            {m.suggestion_questions.map(
                                              (ques: string, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="suggestion-item"
                                                  role="button"
                                                  tabIndex={isLoading ? -1 : 0}
                                                  aria-disabled={isLoading}
                                                  onClick={() => {
                                                    if (isLoading) return;
                                                    handleQuestionClick(ques);
                                                    toggleSection(
                                                      i,
                                                      "suggestions",
                                                    );
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (
                                                      isLoading ||
                                                      (e.key !== "Enter" &&
                                                        e.key !== " ")
                                                    )
                                                      return;
                                                    e.preventDefault();
                                                    handleQuestionClick(ques);
                                                    toggleSection(
                                                      i,
                                                      "suggestions",
                                                    );
                                                  }}
                                                >
                                                  <span className="suggestion-text">
                                                    {ques}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    className={`suggestion-copy-button ${copiedSuggestionKey === `${i}-suggestion-${idx}` ? "copied" : ""}`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCopySuggestedPrompt(
                                                        ques,
                                                        `${i}-suggestion-${idx}`,
                                                      );
                                                    }}
                                                    aria-label="Copy suggested prompt"
                                                    title={
                                                      copiedSuggestionKey ===
                                                      `${i}-suggestion-${idx}`
                                                        ? "Copied!"
                                                        : "Copy"
                                                    }
                                                  >
                                                    <Copy size={14} />
                                                    <span>
                                                      {copiedSuggestionKey ===
                                                      `${i}-suggestion-${idx}`
                                                        ? "Copied!"
                                                        : "Copy"}
                                                    </span>
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  {m.type === "incoming" && (
                                    <div className="message-actions">
                                      <button
                                        className={`action-button icon ${copiedMessageIndex === i ? "copied" : ""}`}
                                        onClick={() =>
                                          handleCopyMessage(m.text, i)
                                        }
                                      >
                                        <Copy size={14} />
                                        <span>
                                          {copiedMessageIndex === i
                                            ? "Copied!"
                                            : "Copy"}
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {m.timestamp && (
                                <div className={`message-timestamp ${m.type}`}>
                                  {m.type === "incoming" ? "Response" : "You"} ·{" "}
                                  {m.timestamp}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* ✅ Common: LoadingSpinner */}
                        {isLoading && <LoadingSpinner />}
                        <div ref={messagesEndRef} />
                      </div>
                      {showScrollToBottom && messages.length > 0 && (
                        <button
                          type="button"
                          className="scroll-to-bottom-btn"
                          onClick={scrollToBottom}
                          aria-label="Scroll to bottom"
                          title="Scroll to bottom"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                  <div className="chat-input-container">
                    <div className="chat-input-field-wrap">
                      {renderChatViewToggle()}
                      <textarea
                        ref={chatInputRef}
                        rows={1}
                        value={
                          activeChatView === "collection"
                            ? collectionSearchInput
                            : input
                        }
                        placeholder="Type your message here..."
                        disabled={activeChatView === "chat" ? isLoading : false}
                        onChange={handleChatInputChange}
                        onKeyDown={(event) =>
                          handleTextareaKeyDown(event, () => {
                            handleInputSubmit();
                          })
                        }
                        className="chat-input-field"
                      />
                    </div>
                    <button
                      disabled={activeChatView === "chat" && isLoading}
                      onClick={handleInputSubmit}
                      className="send-button"
                    >
                      <SendIcon idSuffix="chat" />
                    </button>
                  </div>
                </>
              ) : activeTab === "history" ? (
                <div className="history-tab-content">
                  {agentId && userId && (
                    <ChatHistoryList
                      batchId={agentId}
                      userUuid={userId}
                      onSessionSelect={(sessionId, loadedMessages) => {
                        void handleSessionSelect(sessionId, loadedMessages);
                      }}
                      onClose={() => {}}
                      showAll={true}
                      agentData={agentData}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="poweredBy">
            Powered by :
            <a href="https://webmap.network/" target="_blank">
              <svg
                width="70"
                height="18"
                viewBox="0 0 70 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_powered)">
                  <path
                    d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
                    fill="#5D5FEF"
                  />
                  <path
                    d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
                    fill="#5D5FEF"
                  />
                  <path
                    d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
                    fill="#5D5FEF"
                  />
                  <path
                    d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
                    fill="#5D5FEF"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_powered">
                    <rect width="70" height="18" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </a>
          </div>
        </>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div
          className="description-modal-overlay"
          onClick={() => setShowDescriptionModal(false)}
        >
          <div
            className="description-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="description-modal-content">
              <button
                className="description-modal-close"
                onClick={() => setShowDescriptionModal(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h3 className="description-modal-title">
                About {agentData.title || "AI Assistant"}
              </h3>
              <p
                className="description-modal-text"
                dangerouslySetInnerHTML={{
                  __html:
                    agentData?.description ??
                    "Ask me anything! I'm here to help you find answers.",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
