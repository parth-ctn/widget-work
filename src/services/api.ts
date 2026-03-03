import {
  API_BASE_URL,
  API_ENDPOINTS,
  CONNECTOR_BASE_URL,
  LLM_READY_BASE_URL,
} from "../config/constants";
import type {
  PolicyCheckPayload,
  PolicyCheckResponse,
  ChatbotHistoryResponse,
  AgentDetailResponse,
  ChatSessionListResponse,
  SavePublishAgentPayload,
  SavePublishAgentResponse,
  CollectionHtmlResponse,
  CollectionTemplate,
  MongoQueryPayload,
  MongoQueryResponse,
  MongoRagRecordsPayload,
  MongoRagRecordsResponse,
} from "../types/index";

/**
 * Performs policy check for widget initialization
 */
export const checkPolicy = async (
  payload: PolicyCheckPayload,
): Promise<PolicyCheckResponse> => {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.POLICY_CHECK}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Policy check failed: ${response.status}`);
  }

  const result = await response.json();

  if (
    !result.data ||
    !result.data.owner_uuid ||
    !result.data.user_uuid ||
    !result.data.publish_id
  ) {
    throw new Error("Policy check denied. Invalid response data.");
  }

  return result;
};

/**
 * Fetches chatbot history
 */
export const fetchChatbotHistory = async (
  domain: string,
  batchId: string,
  userUuid: string,
  visitorId: string,
  sessionId?: string,
): Promise<ChatbotHistoryResponse> => {
  let url = `${API_BASE_URL}${API_ENDPOINTS.CHATBOT_HISTORY}?domain=${domain}&batch_id=${batchId}&user_uuid=${userUuid}&visitor_id=${visitorId}&is_agent=true&is_widget=true`;

  if (sessionId) {
    url += `&session_id=${sessionId}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Chatbot history fetch failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Fetches agent details
 */
export const fetchAgentDetails = async (
  userUuid: string,
  publishId: string,
): Promise<AgentDetailResponse> => {
  const url = `${API_BASE_URL}${API_ENDPOINTS.AGENT_DETAIL}?user_uuid=${userUuid}&publish_id=${publishId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Agent details fetch failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Releases the Milvus collection
 */
export const releaseCollection = async (
  collectionName: string,
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.RELEASE_COLLECTION}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collection_name: collectionName }),
    },
  );

  if (!response.ok) {
    throw new Error(`Release collection failed: ${response.status}`);
  }
};

/**
 * Fetches chat session list
 */
export const fetchChatSessions = async (
  batchId: string,
  userUuid: string,
  visitorId: string,
): Promise<ChatSessionListResponse> => {
  console.log("chat-session visitorId:", visitorId);

  const url = `${API_BASE_URL}${API_ENDPOINTS.CHATBOT_SESSION}?batch_id=${batchId}&user_uuid=${userUuid}&visitor_id=${visitorId}&is_agent=true&is_widget=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Chat sessions fetch failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Deletes a chat session
 */
export const deleteChatSession = async (
  chatSessionId: string,
  userUuid: string,
  visitorId: string,
): Promise<void> => {
  const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT_SESSION_DELETE}${chatSessionId}/delete/?user_uuid=${userUuid}&visitor_id=${visitorId}&is_widget=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Chat session delete failed: ${response.status}`);
  }
};

/**
 * Saves publish agent interaction
 */
export const savePublishAgent = async (
  payload: SavePublishAgentPayload,
): Promise<SavePublishAgentResponse> => {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.SAVE_PUBLISH_AGENT}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Save publish agent failed: ${response.status}`);
  }

  return response.json();
};

export const fetchCollectionHtml = async (payload: {
  user_uuid: string;
  batch_id: string;
}): Promise<CollectionHtmlResponse> => {
  const params = new URLSearchParams({
    user_uuid: payload.user_uuid,
    batch_id: payload.batch_id,
  });
  const url = `${LLM_READY_BASE_URL}${API_ENDPOINTS.COLLECTION_HTML}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Collection HTML fetch failed: ${response.status}`);
  }

  return response.json();
};

export const loadCollectionAssets = async (
  collectionItems: CollectionTemplate[],
): Promise<CollectionTemplate[]> => {
  const fetchText = async (url?: string) => {
    if (!url) return "";
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Collection asset fetch failed: ${response.status}`);
    }
    return response.text();
  };

  return Promise.all(
    collectionItems.map(async (item) => {
      const [html, css, js] = await Promise.all([
        fetchText(item.html_s3_url),
        fetchText(item.css_s3_url),
        fetchText(item.js_s3_url),
      ]);

      return {
        ...item,
        html,
        css,
        js,
      };
    }),
  );
};

export const queryMongoRagRecords = async (
  payload: MongoQueryPayload,
): Promise<MongoQueryResponse> => {
  const response = await fetch(
    `${CONNECTOR_BASE_URL}${API_ENDPOINTS.MONGODB_QUERY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Mongo query failed: ${response.status}`);
  }

  return response.json();
};

export const fetchCollectionRecords = async (
  payload: MongoRagRecordsPayload,
): Promise<MongoRagRecordsResponse> => {
  const endpoint = payload.isChatAgent
    ? "api/front/external-utility/mongodb-rag/records"
    : "api/front/v1/external-utility/mongodb-rag/records";

  const response = await fetch(`${CONNECTOR_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Collection records fetch failed: ${response.status}`);
  }

  return response.json();
};

export const saveChatSchema = async (
  questionId: string,
  payload: { mongo_rag_response: Record<string, any> },
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.CHAT_UPDATE}${questionId}/`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Save chat schema failed: ${response.status}`);
  }
};

// ─── Toggle Like ──────────────────────────────────────────────────────────────

export interface ToggleLikePayload {
  collection_name: string;
  record_id: string;
  id: string;
  is_visitor: boolean;
}

export interface ToggleLikeResponse {
  like_count?: number;
  is_liked?: boolean;
  [key: string]: any;
}

export const toggleCatalogueLike = async (
  payload: ToggleLikePayload,
): Promise<ToggleLikeResponse> => {
  const response = await fetch(
    `${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/toggle-like`,
    {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Toggle like failed: ${response.status}`);
  }

  return response.json();
};

// ─── Likes History ────────────────────────────────────────────────────────────

export interface LikesHistoryPayload {
  collection_name: string;
  records: string[];
  id: string;
  is_visitor: boolean;
}

// ✅ API actual response structure (Image 1 ma joi):
// stats: { views: number, impressions: number, likes: number }
// shares field nathi — increment-views API views increment kare che
// eetle shareCount sync karva stats.views use karva nu
export interface LikesHistoryResponse {
  data?: {
    [recordId: string]: {
      liked: boolean;
      stats: {
        views: number; // ✅ increment-views API aa j field update kare che
        impressions: number;
        likes: number;
      };
      isFeatured?: boolean;
      isActive?: boolean;
    };
  };
}

export const fetchLikesHistory = async (
  payload: LikesHistoryPayload,
): Promise<LikesHistoryResponse> => {
  const response = await fetch(
    `${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/user-likes-history`,
    {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Likes history fetch failed: ${response.status}`);
  }

  return response.json();
};

// ─── Increment Impressions ────────────────────────────────────────────────────

export interface ImpressionRecord {
  collection_name: string;
  _id: string;
}

export interface IncrementImpressionsPayload {
  record: ImpressionRecord[];
}

export interface IncrementViewsPayload {
  collection_name: string;
  record_id: string;
}

export const incrementImpressions = async (
  payload: IncrementImpressionsPayload,
): Promise<void> => {
  const response = await fetch(
    `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-impressions-v2`,
    {
      method: "PUT",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Increment impressions failed: ${response.status}`);
  }
};

export const incrementViews = async (
  payload: IncrementViewsPayload,
): Promise<void> => {
  const response = await fetch(
    `${CONNECTOR_BASE_URL}api/front/external-utility/analytics/increment-views`,
    {
      method: "PUT",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok)
    throw new Error(`Increment views failed: ${response.status}`);
};
// ─── Featured Records ─────────────────────────────────────────────────────────

export interface FeaturedRecord {
  _id: string;
  [key: string]: any; // dynamic fields from MongoDB
}

export interface FeaturedRecordsResponse {
  data?: FeaturedRecord[];
  [key: string]: any;
}

export const fetchFeaturedRecords = async (
  collectionName: string,
  token?: string,
): Promise<FeaturedRecordsResponse> => {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
  };
  if (token) {
    headers["token"] = token;
  }

  const response = await fetch(
    `${CONNECTOR_BASE_URL}api/front/external-utility/catalogue/featured-records`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ collection_name: collectionName }),
    },
  );

  if (!response.ok) {
    throw new Error(`Featured records fetch failed: ${response.status}`);
  }

  return response.json();
};