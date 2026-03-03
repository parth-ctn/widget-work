import { useState, useEffect, useRef } from "react";
import { WebSocketService } from "../services/websocket";
import type { WebSocketMessage, Message } from "../types/index";
import { formatTimestamp, formatTimestampFromString } from "../utils/date";
import {
  releaseCollection,
  fetchChatbotHistory,
  queryMongoRagRecords,
  saveChatSchema,
} from "../services/api";
import {
  getSessionId,
  setActiveSession,
  clearActiveSession,
  getBackendSessionId,
} from "../utils/storage";
import { renderMarkdownToHtml } from "../utils/markdownToHTML";
import { mapMongoRagResponseToCollections } from "../utils/collections";

type HistoryContext = {
  batchId?: string;
  userUuid?: string;
  visitorId?: string;
  domain?: string;
  collectionNames?: string[];
};

type SessionUnsubscribes = {
  unsubscribeMessage?: () => void;
  unsubscribeConnection?: () => void;
  removeBeforeUnload?: () => void;
  cleanupUnsubscribe?: () => void;
};

type SessionCache = {
  sessionId: string;
  socketUrl?: string;
  service?: WebSocketService | null;
  messages: Message[];
  initialResponse: string;
  isLoading: boolean;
  isConnected: boolean;
  connectionError: string | null;
  hasInitialPromptSent: boolean;
  hasInitialResponseReceived: boolean;
  waiting: boolean;
  unsubscribes?: SessionUnsubscribes;
  cleanup?: (() => void) | null;
};

type StartSessionInput =
  | string
  | {
      socketUrl?: string;
      sessionId?: string;
      preloadMessages?: Message[];
      resetState?: boolean;
      connect?: boolean;
      terminateOthers?: boolean;
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

/**
 * Custom hook to manage WebSocket connections across multiple chat sessions.
 * Keeps sockets alive in the background until responses arrive and reuses
 * the same socket when a user returns to a chat.
 */
export const useWebSocket = (
  socketUrl?: string,
  collectionName?: string,
  agentId?: string,
  historyContext?: HistoryContext
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initialResponse, setInitialResponse] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const sessionStoreRef = useRef<Record<string, SessionCache>>({});
  const activeSessionIdRef = useRef<string | null>(null);
  const collectionNameRef = useRef<string | undefined>(collectionName);
  const agentIdRef = useRef<string | undefined>(agentId);
  const historyContextRef = useRef<HistoryContext | undefined>(historyContext);
  const defaultSocketUrlRef = useRef<string | undefined>(socketUrl);

  collectionNameRef.current = collectionName;
  agentIdRef.current = agentId;
  historyContextRef.current = historyContext;
  if (socketUrl) {
    defaultSocketUrlRef.current = socketUrl;
  }

  const getSessionKey = (sessionId?: string | null) => {
    return (
      sessionId ||
      extractSessionIdFromUrl(defaultSocketUrlRef.current) ||
      "default"
    );
  };

  const ensureSession = (
    sessionId?: string | null,
    socketUrlOverride?: string
  ): SessionCache => {
    const key = getSessionKey(sessionId);
    const existing = sessionStoreRef.current[key];
    if (existing) {
      if (socketUrlOverride) {
        existing.socketUrl = socketUrlOverride;
      }
      return existing;
    }

    const fresh: SessionCache = {
      sessionId: key,
      socketUrl: socketUrlOverride,
      service: null,
      messages: [],
      initialResponse: "",
      isLoading: false,
      isConnected: false,
      connectionError: null,
      hasInitialPromptSent: false,
      hasInitialResponseReceived: false,
      waiting: false,
      unsubscribes: undefined,
      cleanup: null,
    };

    sessionStoreRef.current[key] = fresh;
    return fresh;
  };

  const applyActiveSessionState = (session: SessionCache) => {
    setMessages(session.messages);
    setIsConnected(session.isConnected);
    setIsLoading(session.waiting || session.isLoading);
    setConnectionError(session.connectionError);
    setInitialResponse(session.initialResponse);
    activeSessionIdRef.current = session.sessionId;
    setActiveSessionId(session.sessionId);
  };

  const updateMessageAtIndex = (
    sessionId: string,
    messageIndex: number,
    updates: Partial<Message>
  ) => {
    const session = ensureSession(sessionId);
    if (!session.messages[messageIndex]) {
      return;
    }

    session.messages = session.messages.map((message, index) =>
      index === messageIndex ? { ...message, ...updates } : message
    );

    if (activeSessionIdRef.current === sessionId) {
      setMessages([...session.messages]);
    }
  };

  const resolveSessionUuid = (session: SessionCache): string | null => {
    return (                                                
      extractSessionIdFromUrl(session.socketUrl) ||
      getBackendSessionId() ||
      (session.sessionId !== "default" ? session.sessionId : null)
    );
  };

  const getLatestUserPrompt = (messagesList: Message[]): string | null => {
    const lastPrompt = [...messagesList]
      .reverse()
      .find((message) => message.type === "outgoing")?.text;
    if (!lastPrompt || !lastPrompt.trim()) {
      return null;
    }
    return lastPrompt.trim();
  };

  const waitForConnection = (service: WebSocketService): Promise<void> => {
    return new Promise((resolve) => {
      if (service.isConnected()) {
        resolve();
        return;
      }

      let unsubscribe: () => void = () => {};
      const timeout = window.setTimeout(() => {
        unsubscribe();
        resolve();
      }, 3000);

      unsubscribe = service.onConnectionChange((connected) => {
        if (connected) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
  };

  const teardownSessionSocket = async (sessionId: string) => {
    const session = sessionStoreRef.current[sessionId];
    if (!session) return;

    session.isConnected = false;
    session.waiting = false;

    session.unsubscribes?.unsubscribeConnection?.();
    session.unsubscribes?.unsubscribeMessage?.();
    session.unsubscribes?.cleanupUnsubscribe?.();
    session.unsubscribes?.removeBeforeUnload?.();
    session.unsubscribes = undefined;

    if (session.cleanup) {
      await session.cleanup();
      session.cleanup = null;
    } else if (session.service) {
      await session.service.disconnect();
    }

    session.service = null;

    if (activeSessionIdRef.current === sessionId) {
      setIsConnected(false);
    }
  };

  const refreshSessionHistory = async (sessionId: string) => {
    const ctx = historyContextRef.current;
    if (
      !ctx?.batchId ||
      !ctx?.userUuid ||
      !ctx?.visitorId ||
      !ctx?.domain
    ) {
      return;
    }

    try {
      const historyData = await fetchChatbotHistory(
        ctx.domain,
        ctx.batchId,
        ctx.userUuid,
        ctx.visitorId,
        sessionId
      );

      const historyMessages: Message[] = [];
      if (historyData.data && Array.isArray(historyData.data)) {
        for (const item of historyData.data) {
          if (item.question) {
            historyMessages.push({
              text: item.question,
              type: "outgoing",
              timestamp: formatTimestampFromString(item.created_at),
              suggestion_questions: [],
            });
          }

          if (item.markdown_response) {
            const htmlResponse = await renderMarkdownToHtml(
              item.markdown_response
            );
            historyMessages.push({
              text: htmlResponse,
              type: "incoming",
              timestamp: formatTimestampFromString(item.created_at),
              suggestion_questions: item.suggestion_questions || [],
              hasSuggestions: item.suggestion_questions?.length > 0,
              hasReferences: true,
              questionId:
                typeof item._id !== "undefined" ? String(item._id) : undefined,
              collections: mapMongoRagResponseToCollections(
                item.mongo_rag_response
              ),
            });
          }
        }
      }

      const session = ensureSession(sessionId);
      session.messages = historyMessages;
      session.initialResponse = "";
      session.hasInitialPromptSent = false;
      session.hasInitialResponseReceived = false;
      session.isLoading = false;

      if (activeSessionIdRef.current === sessionId) {
        setMessages(historyMessages);
        setIsLoading(false);
        setInitialResponse("");
      }
    } catch (error) {
      console.error("Error refreshing chat history:", error);
    }
  };

  const fetchCollectionsForMessage = async (
    sessionId: string,
    messageIndex: number,
    questionId?: string
  ) => {
    const ctx = historyContextRef.current;
    const collectionNames =
      ctx?.collectionNames?.filter((name) => name && name.trim()) ?? [];

    if (!ctx?.batchId || !ctx?.userUuid || collectionNames.length === 0) {
      return;
    }

    const session = ensureSession(sessionId);
    const query = getLatestUserPrompt(session.messages);
    const sessionUuid = resolveSessionUuid(session);

    if (!query || !sessionUuid || !questionId) {
      return;
    }

    updateMessageAtIndex(sessionId, messageIndex, {
      isCollectionLoading: true,
      collectionError: undefined,
    });

    try {
      const response = await queryMongoRagRecords({
        query,
        collection_names: collectionNames,
        user_uuid: ctx.userUuid,
        session_uuid: sessionUuid,
        llm_provider: "gemini_modality",
        question_id: questionId,
        batch_uuid: ctx.batchId,
      });

      const collections = mapMongoRagResponseToCollections(response.data);
      updateMessageAtIndex(sessionId, messageIndex, {
        collections,
        isCollectionLoading: false,
        collectionError: undefined,
      });

      if (response.data) {
        await saveChatSchema(questionId, {
          mongo_rag_response: response.data,
        });
      }
    } catch (error) {
      console.error("Error loading product collections:", error);
      updateMessageAtIndex(sessionId, messageIndex, {
        isCollectionLoading: false,
        collectionError: "Failed to load product collections.",
      });
    }
  };

  const handleIncomingMessage = async (
    sessionId: string,
    data: WebSocketMessage
  ) => {
    const session = ensureSession(sessionId);

    if (data.error) {
      console.error("Server error:", data.error);
      session.connectionError = data.error;
      session.isLoading = false;
      session.waiting = false;
      if (activeSessionIdRef.current === sessionId) {
        setConnectionError(data.error);
        setIsLoading(false);
      }
      return;
    }

    session.connectionError = null;

    if ("info" in data) {
      return;
    }

    if (data.type === "typing") {
      session.isLoading = true;
      session.waiting = true;
      if (activeSessionIdRef.current === sessionId) {
        setIsLoading(true);
      }
      return;
    }

    if (data.type === "ping" || data.type === "pong") {
      return;
    }

    const isResponseMessage =
      data.chat_type === "response_found" ||
      data.chat_type === "no_response_found" ||
      Boolean(data.response);

    if (!isResponseMessage) {
      console.log("Unknown message structure received", data);
      return;
    }

    session.isLoading = false;
    session.waiting = false;

    const htmlResponse = await renderMarkdownToHtml(data.response || "");
    const questionId =
      typeof data._id !== "undefined"
        ? String(data._id)
        : typeof data.question_id !== "undefined"
        ? String(data.question_id)
        : undefined;

    if (session.hasInitialPromptSent && !session.hasInitialResponseReceived) {
      session.hasInitialResponseReceived = true;
      session.initialResponse = htmlResponse;
    }

    // Append the response to the visible transcript (including the first one)
    const incomingMessage: Message = {
      text: htmlResponse,
      type: "incoming",
      timestamp: formatTimestampFromString(data.created_at),
      hasSuggestions: data.suggestion_questions?.length > 0,
      hasReferences: true,
      suggestion_questions: data?.suggestion_questions || [],
      questionId,
      collections: [],
    };

    session.messages = [...session.messages, incomingMessage];
    const messageIndex = session.messages.length - 1;
    if (questionId) {
      void fetchCollectionsForMessage(sessionId, messageIndex, questionId);
    }

    const isActive = activeSessionIdRef.current === sessionId;
    if (isActive) {
      setMessages([...session.messages]);
      setInitialResponse(session.initialResponse);
      setIsLoading(false);
    } else {
      // Close the socket after a response only when the user is away,
      // then refresh history from API so cached sessions stay up-to-date.
      await teardownSessionSocket(sessionId);
      await refreshSessionHistory(sessionId);
    }
  };

  const connectSession = (
    sessionId: string,
    socketUrlOverride?: string
  ): WebSocketService | null => {
    const session = ensureSession(sessionId, socketUrlOverride);
    const urlToUse = socketUrlOverride || session.socketUrl;
    if (!urlToUse) {
      console.warn("Missing socket URL for session:", sessionId);
      return null;
    }

    if (session.service) {
      session.service.connect();
      return session.service;
    }

    const service = new WebSocketService(urlToUse);
    session.service = service;
    session.socketUrl = urlToUse;
    session.connectionError = null;

    const unsubscribeConnection = service.onConnectionChange((connected) => {
      session.isConnected = connected;
      if (activeSessionIdRef.current === sessionId) {
        setIsConnected(connected);
      }
    });

    const unsubscribeMessage = service.onMessage(async (incoming) => {
      await handleIncomingMessage(sessionId, incoming);
    });

    const unsubscribeCleanup = collectionNameRef.current
      ? service.onCleanup(async () => {
          try {
            await releaseCollection(collectionNameRef.current!);
          } catch (error) {
            console.error("Error releasing collection:", error);
          }
        })
      : undefined;

    const handleBeforeUnload = () => {
      if (agentIdRef.current) {
        clearActiveSession(agentIdRef.current);
      }
      service.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    session.unsubscribes = {
      unsubscribeMessage,
      unsubscribeConnection,
      cleanupUnsubscribe: unsubscribeCleanup,
      removeBeforeUnload: () =>
        window.removeEventListener("beforeunload", handleBeforeUnload),
    };

    session.cleanup = async () => {
      unsubscribeConnection?.();
      unsubscribeMessage?.();
      if (collectionNameRef.current && unsubscribeCleanup) {
        unsubscribeCleanup();
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      await service.disconnect();
    };

    const uiSessionId = getSessionId();
    if (uiSessionId && agentIdRef.current) {
      setActiveSession(agentIdRef.current, uiSessionId);
    }

    service.connect();
    return service;
  };

  useEffect(() => {
    if (!socketUrl) {
      return;
    }

    const initialSessionId =
      extractSessionIdFromUrl(socketUrl) || activeSessionIdRef.current;

    const session = ensureSession(initialSessionId, socketUrl);
    applyActiveSessionState(session);

    return () => {
      Object.keys(sessionStoreRef.current).forEach((id) => {
        teardownSessionSocket(id);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl]);

  const sendMessage = async (text: string, sessionId?: string) => {
    if (!text.trim()) return;

    const targetSessionId = getSessionKey(
      sessionId || activeSessionIdRef.current
    );
    const session = ensureSession(targetSessionId);

    if (!session.socketUrl) {
      console.warn("WebSocket not connected, message not sent");
      return;
    }

    session.connectionError = null;
    if (activeSessionIdRef.current === targetSessionId) {
      setConnectionError(null);
    }

    const timestamp = formatTimestamp();
    const outgoingMessage: Message = {
      text,
      type: "outgoing",
      timestamp,
      suggestion_questions: [],
    };

    session.messages = [...session.messages, outgoingMessage];
    session.isLoading = true;
    session.waiting = true;
    session.hasInitialPromptSent = true;
    session.hasInitialResponseReceived = false;
    session.initialResponse = "";

    if (activeSessionIdRef.current === targetSessionId) {
      setMessages(session.messages);
      setIsLoading(true);
      setInitialResponse("");
    }

    const service = connectSession(targetSessionId, session.socketUrl);
    if (!service) return;

    await waitForConnection(service);
    session.isConnected = true;
    if (activeSessionIdRef.current === targetSessionId) {
      setIsConnected(true);
    }

    service.send({
      type: "chat",
      prompt: text,
      k_value: 5,
    });
  };

  const closeConnection = async () => {
    if (agentIdRef.current) {
      clearActiveSession(agentIdRef.current);
    }

    const teardownPromises = Object.keys(sessionStoreRef.current).map((id) =>
      teardownSessionSocket(id)
    );
    await Promise.all(teardownPromises);
    setIsConnected(false);
  };

  const reconnect = () => {
    const targetSessionId = activeSessionIdRef.current;
    if (!targetSessionId) return;

    const session = ensureSession(targetSessionId);
    if (session.socketUrl) {
      connectSession(targetSessionId, session.socketUrl);
    }
  };

  const loadMessages = (loadedMessages: Message[], sessionId?: string) => {
    const targetSessionId = getSessionKey(
      sessionId || activeSessionIdRef.current
    );
    const session = ensureSession(targetSessionId);

    session.messages = loadedMessages;
    session.initialResponse = "";
    session.isLoading = false;
    session.waiting = false;
    session.hasInitialPromptSent = loadedMessages.length > 0;
    session.hasInitialResponseReceived = true;

    if (activeSessionIdRef.current === targetSessionId) {
      setMessages(loadedMessages);
      setInitialResponse("");
      setIsLoading(false);
    }
  };

  const startNewSession = async (input?: StartSessionInput) => {
    const config =
      typeof input === "string"
        ? { socketUrl: input }
        : input || { connect: true };

    const targetSessionId = getSessionKey(
      config.sessionId || extractSessionIdFromUrl(config.socketUrl)
    );
    const session = ensureSession(targetSessionId, config.socketUrl);

    if (config.terminateOthers) {
      const otherSessionIds = Object.keys(sessionStoreRef.current).filter(
        (id) => id !== targetSessionId
      );
      await Promise.all(otherSessionIds.map((id) => teardownSessionSocket(id)));
    }

    if (config.resetState) {
      session.messages = [];
      session.initialResponse = "";
      session.connectionError = null;
      session.hasInitialPromptSent = false;
      session.hasInitialResponseReceived = false;
      session.isLoading = false;
      session.waiting = false;
    }

    // Only apply preload when we don't already have an in-progress session
    if (
      config.preloadMessages &&
      (session.messages.length === 0 || config.resetState) &&
      !session.waiting
    ) {
      session.messages = config.preloadMessages;
      session.initialResponse = "";
      session.hasInitialPromptSent = false;
      session.hasInitialResponseReceived = false;
      session.isLoading = false;
      session.waiting = false;
    }

    applyActiveSessionState(session);

    const shouldConnect = config.connect !== false || session.waiting;
    if (shouldConnect) {
      connectSession(targetSessionId, session.socketUrl);
    }

    return targetSessionId;
  };

  return {
    messages,
    isConnected,
    isLoading,
    connectionError,
    sendMessage,
    closeConnection,
    reconnect,
    initialResponse,
    loadMessages,
    startNewSession,
    activeSessionId,
  };
};
