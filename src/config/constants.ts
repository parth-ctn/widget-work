// API and WebSocket configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const LLM_READY_BASE_URL =
  import.meta.env.VITE_LLM_READY_BASE_URL ??
  "https://llm-ready.blockverse.tech/llm-ready/";
export const CONNECTOR_BASE_URL =
  import.meta.env.VITE_CONNECTOR_BASE_URL ??
  "https://connector.api.blockverse.tech/";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
export const WIDGET_DOMAIN = import.meta.env.VITE_WIDGET_DOMAIN;

// WebSocket configuration
export const WS_CONFIG = {
  PING_INTERVAL: 30000, // 30 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000, // 1 second
} as const;

// Storage keys
export const STORAGE_KEYS = {
  VISITOR_ID: "webmap_visitor_id",
  SESSION_ID: "webmap_session_id",
} as const;

// Widget configuration
export const WIDGET_CONFIG = {
  SHADOW_HOST_ID: "webmap-widget-shadow-host",
  CONTAINER_ID: "webmap-widget-container",
  CHAT_WIDGET_ROOT_ID: "chat-widget-root",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  POLICY_CHECK: "widget/policy-check/",
  CHATBOT_HISTORY: "chatbot-history/",
  CHATBOT_SESSION: "chatbot-session/",
  CHAT_SESSION_DELETE: "chat-session/",
  AGENT_DETAIL: "publish/agent-detail/",
  RELEASE_COLLECTION: "release-collection/",
  SAVE_PUBLISH_AGENT: "publish/save-publish-agent/",
  CHAT_UPDATE: "chat-update/",
  COLLECTION_HTML: "fetch-html-css-js/",
  MONGODB_QUERY: "api/front/external-utility/query/mongodb",
} as const;
