export interface CollectionEntry {
  collectionKey: string;
  records: any[];
}

// Message types
export interface Message {
  suggestion_questions: any;
  text: string;
  type: "incoming" | "outgoing";
  timestamp?: string;
  hasSuggestions?: boolean;
  hasReferences?: boolean;
  questionId?: string;
  collections?: CollectionEntry[];
  isCollectionLoading?: boolean;
  collectionError?: string;
}

// Widget configuration
export interface WidgetConfig {
  publishId: string;
  userId: string;
  tokenId: string;
  ownerId: string;
  batchId: string;
}

// Init configuration
export interface InitConfig {
  publishId?: string;
  userId?: string;
  tokenId?: string;
  ownerId?: string;
  batchId?: string;
  socketUrl?: string;
  shadowRoot?: ShadowRoot;
  agentData?: AgentData;
}

// Policy check payload
export interface PolicyCheckPayload {
  user_uuid: string;
  token_id: string;
  publish_id: string;
  domain: string;
}

// Policy check response
export interface PolicyCheckResponse {
  data: {
    owner_uuid: string;
    user_uuid: string;
    publish_id: string;
    batch_id: string;
  };
}

// Chatbot history response
export interface ChatbotHistoryResponse {
  session_id?: string;
  [key: string]: any;
}

// Social media link
export interface SocialMediaLink {
  type: string;
  link: string;
}

// Custom link (e.g., Sales Information button)
export interface CustomLink {
  label: string;
  link: string;
}

// Agent data
export interface AgentData {
  publish_agent_profile: string | undefined;
  title: string;
  description: string;
  conversation_starters: string[];
  milvus_collection?: string;
  domain?: string;
  mongo_db_rag_collection_name?: string[];
  social_media?: SocialMediaLink[];
  custom_link?: CustomLink;
  contact_number?: string;
  email?: string;
}

// Agent detail response
export interface AgentDetailResponse {
  results?: AgentData[];
  [key: number]: AgentData;
}

// WebSocket message types
export interface WebSocketMessage {
  error: any;
  suggestion_questions: any;
  type?: string;
  chat_type?: "response_found" | "no_response_found";
  response?: string;
  created_at?: string;
  _id?: string | number;
  question_id?: string | number;
  isTyping?: boolean;
  status?: string;
}

// WebSocket send message
export interface WebSocketSendMessage {
  type: string;
  prompt?: string;
  k_value?: number;
}

// URL parameters
export interface URLParams {
  agentId: string | null;
  tokenId: string | null;
  ownerId: string | null;
}

// Domain info
export interface DomainInfo {
  protocol: string;
  hostname: string;
  port: string;
  currentDomain: string;
}

// Chat session
export interface ChatSession {
  session_id: string;
  chat_session_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Chat session list response
export interface ChatSessionListResponse {
  data: any;
  results: ChatSession[];
  count: number;
}

// Save publish agent payload
export interface SavePublishAgentPayload {
  publish_id: string;
  // user_uuid?: string;
  visitor_id: string;
  is_widget: boolean;
  ip?: string;
}

// Save publish agent response
export interface SavePublishAgentResponse {
  [key: string]: any;
}

export interface CollectionHtmlResponse {
  data?: CollectionTemplate[];
  [key: string]: any;
}

export interface CollectionTemplate {
  batch_id?: string;
  mongo_db_rag_collection_name?: string;
  html_s3_url?: string;
  css_s3_url?: string;
  js_s3_url?: string;
  output_ratio?: string;
  html?: string;
  css?: string;
  js?: string;
  [key: string]: any;
}

export interface MongoQueryPayload {
  query: string;
  collection_names: string[];
  user_uuid: string;
  session_uuid: string;
  llm_provider: string;
  question_id?: string | number;
  batch_uuid: string;
}

export interface MongoQueryResponse {
  data?: Record<string, any>;
  [key: string]: any;
}

export interface MongoRagRecordsPayload {
  query?: string;
  collection_name: string;
  user_uuid: string;
  session_uuid: string;
  llm_provider: string;
  limit: number;
  skip: number;
  previousQuery?: any;
  previousPipeline?: any;
  isChatAgent?: boolean;
}

export interface MongoRagRecordsResponse {
  data?: {
    collection_name?: string;
    records?: any[];
    recordsTotal?: number;
    records_total?: number;
    previousPipeline?: any;
    previousQuery?: any;
  };
  [key: string]: any;
}
