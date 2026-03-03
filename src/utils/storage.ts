import { STORAGE_KEYS } from '../config/constants';
import { generateUUID } from './uuid';

/**
 * Gets or creates a visitor ID (persistent across sessions)
 */
export const getOrCreateVisitorId = (): string => {
  let visitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
  }
  return visitorId;
};

/**
 * Gets or creates a session ID (new for each session)
 */
export const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
};

/**
 * Sets the session ID (typically from server response)
 */
export const setSessionId = (sessionId: string): void => {
  sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
};

/**
 * Gets the current session ID
 */
export const getSessionId = (): string | null => {
  return sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
};

/**
 * Marks a chat session as active
 */
export const setActiveSession = (agentId: string, sessionId: string): void => {
  sessionStorage.setItem(`chat_active_${agentId}`, sessionId);
};

/**
 * Gets the active session for a chat
 */
export const getActiveSession = (agentId: string): string | null => {
  return sessionStorage.getItem(`chat_active_${agentId}`);
};

/**
 * Clears the active session
 */
export const clearActiveSession = (agentId: string): void => {
  sessionStorage.removeItem(`chat_active_${agentId}`);
};

/**
 * Backend session ID management (from chat history API)
 * This is used ONLY for API calls and socket communication
 */
const BACKEND_SESSION_KEY = 'webmap_backend_session_id';

export const setBackendSessionId = (sessionId: string): void => {
  sessionStorage.setItem(BACKEND_SESSION_KEY, sessionId);
};

export const getBackendSessionId = (): string | null => {
  return sessionStorage.getItem(BACKEND_SESSION_KEY);
};

export const clearBackendSessionId = (): void => {
  sessionStorage.removeItem(BACKEND_SESSION_KEY);
};
