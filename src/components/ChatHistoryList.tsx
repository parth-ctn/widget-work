import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import {
  fetchChatSessions,
  fetchChatbotHistory,
  deleteChatSession,
} from "../services/api";
import { getDomainInfo } from "../utils/domain";
import type { ChatSession, Message, AgentData } from "../types/index";
import "../styles.scss";
import { Search, ChevronRight, Trash2 } from "lucide-react";
import { useVisitor } from "../contexts/VisitorContext";
import { renderMarkdownToHtml } from "../utils/markdownToHTML";
import { formatTimestampFromString } from "../utils/date";
import { mapMongoRagResponseToCollections } from "../utils/collections";

interface ChatHistoryListProps {
  batchId: string;
  userUuid: string;
  onSessionSelect: (sessionId: string, messages: Message[]) => void;
  onClose: () => void;
  showAll?: boolean;
  agentData?: AgentData;
}

export default function ChatHistoryList({
  batchId,
  userUuid,
  onSessionSelect,
  onClose,
  showAll = false,
  agentData,
}: ChatHistoryListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { visitorId, isLoading: isVisitorLoading } = useVisitor();

  const getSessionId = (session: ChatSession) =>
    session.chat_session_id || session.session_id;

  useEffect(() => {
    const loadSessions = async () => {
      // Wait for visitorId to be loaded
      if (isVisitorLoading || !visitorId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchChatSessions(batchId, userUuid, visitorId);
        console.log("📋 Chat sessions fetched:", data);
        console.log("📋 Number of sessions:", data.data?.length || 0);

        setSessions(data.data || []);
        setFilteredSessions(data.data || []);
      } catch (err) {
        console.error("❌ Error fetching chat sessions:", err);
        setError("Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [batchId, userUuid, visitorId, isVisitorLoading]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter((session) =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessions]);

  const handleSessionClick = async (sessionId: string) => {
    console.log("🔄 Loading session:", sessionId);
    setLoading(true);
    setError(null);

    try {
      // Use registered domain from agentData, fallback to current domain if not available
      const domain = agentData?.domain || getDomainInfo().currentDomain;
      console.log("📍 Using domain for fetchChatbotHistory:", domain);

      const historyData = await fetchChatbotHistory(
        domain,
        batchId,
        userUuid,
        visitorId,
        sessionId,
      );

      console.log("Chat history loaded:", historyData);

      // Parse the history data and convert to Message format
      const loadedMessages: Message[] = [];
      if (historyData.data && Array.isArray(historyData.data)) {
        for (const item of historyData.data) {
          // Add user question as outgoing message (use question, not prompt)
          if (item.question) {
            loadedMessages.push({
              text: item.question,
              type: "outgoing",
              timestamp: formatTimestampFromString(item.created_at),
              suggestion_questions: [],
            });
          }

          // Then add bot response as incoming message with markdown conversion
          if (item.markdown_response) {
            const htmlResponse = await renderMarkdownToHtml(
              item.markdown_response,
            );
            loadedMessages.push({
              text: htmlResponse,
              type: "incoming",
              timestamp: formatTimestampFromString(item.created_at),
              suggestion_questions: item.suggestion_questions || [],
              hasSuggestions: item.suggestion_questions?.length > 0,
              hasReferences: true,
              questionId:
                typeof item._id !== "undefined" ? String(item._id) : undefined,
              collections: mapMongoRagResponseToCollections(
                item.mongo_rag_response,
              ),
            });
          }
        }
      }

      onSessionSelect(sessionId, loadedMessages);
    } catch (err) {
      console.error("❌ Error loading chat history:", err);
      setError("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: MouseEvent, session: ChatSession): void => {
    e.stopPropagation();
    setDeleteError(null);
    setSessionToDelete(session);
  };

  const closeDeleteModal = () => {
    setSessionToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) {
      return;
    }

    const sessionId = getSessionId(sessionToDelete);
    if (!sessionId) {
      setDeleteError("Missing session id for deletion");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteChatSession(sessionId, userUuid, visitorId);

      setSessions((prev) =>
        prev.filter((item) => getSessionId(item) !== sessionId),
      );
      setFilteredSessions((prev) =>
        prev.filter((item) => getSessionId(item) !== sessionId),
      );
      closeDeleteModal();
    } catch (err) {
      console.error("Error deleting chat session:", err);
      setDeleteError("Failed to delete session. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="chat-history-inline">
      {/* Search Input */}
      <div className="chat-history-search">
        <div className="position-relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="history-search-input"
          />
          <span className="search-icon">
            <Search />
          </span>
        </div>
      </div>

      {/* History List */}
      <div className="chat-history-list">
        {loading && (
          <div className="history-loading">Loading chat history...</div>
        )}

        {error && <div className="history-error">{error}</div>}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="history-empty">No chat history available</div>
        )}

        {!loading &&
          !error &&
          (showAll ? filteredSessions : filteredSessions.slice(0, 3)).map(
            (session) => {
              const sessionId = getSessionId(session);
              return (
                <div
                  key={sessionId}
                  className="history-item"
                  onClick={() => sessionId && handleSessionClick(sessionId)}
                >
                  <div className="history-item-content">
                    <div className="history-item-session-name">
                      {session.title || "Untitled Chat"}
                    </div>
                  </div>
                  <div className="history-item-actions">
                    <button
                      className="history-action-btn delete"
                      title="Delete session"
                      onClick={(e) => handleDeleteClick(e, session)}
                      aria-label="Delete chat session"

                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="history-item-arrow">
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            },
          )}
      </div>

      {sessionToDelete && (
        <div
          className="history-delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="history-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">Delete this conversation?</div>
            <div className="modal-body">
              This will permanently remove "
              {sessionToDelete.title || "Untitled Chat"}".
            </div>
            {deleteError && <div className="modal-error">{deleteError}</div>}
            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="modal-button danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


