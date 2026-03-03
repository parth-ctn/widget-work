import { SOCKET_URL } from "../config/constants";
import { checkPolicy, fetchChatbotHistory, fetchAgentDetails } from "./api";
import type { PolicyCheckPayload, WidgetConfig } from "../types/index";
import {
  getOrCreateSessionId,
  setSessionId,
  getSessionId,
  setBackendSessionId,
  getBackendSessionId,
} from "../utils/storage";
import { getDomainInfo } from "../utils/domain";

/**
 * Builds the socket URL with all required parameters
 */
export const buildSocketUrl = (
  publishId: string,
  userUuid: string,
  sessionId: string,
  tokenId: string,
  visitorId: string,
  domain: string
): string => {
  return `${SOCKET_URL}${publishId}/?domain=${domain}&user_uuid=${userUuid}&session_id=${sessionId}&token_id=${tokenId}&visitor_id=${visitorId}`;
};

/**
 * Initializes widget by performing policy check and fetching history
 */
export const initializeWidget = async (
  payload: PolicyCheckPayload,
  visitorId: string
): Promise<{ config: WidgetConfig; socketUrl: string; agentData?: any }> => {
  console.log("Visitor ID:", visitorId);

  // Perform policy check (using current domain for policy check only)
  const policyResult = await checkPolicy(payload);
  const { owner_uuid, user_uuid, publish_id, batch_id } = policyResult.data;

  // Fetch agent details FIRST to get the domain from results
  let agentDomain: string | undefined;
  let fetchedAgentData: any = null;
  try {
    const agentDetailsResult = await fetchAgentDetails(user_uuid, publish_id);
    console.log("Agent details fetched:", agentDetailsResult);

    // Handle both response formats: direct array or wrapped in results
    const agentArray = Array.isArray(agentDetailsResult)
      ? agentDetailsResult
      : agentDetailsResult.results;

    if (agentArray && agentArray.length > 0) {
      fetchedAgentData = agentArray[0];
      if (fetchedAgentData.domain) {
        agentDomain = fetchedAgentData.domain;
        console.log("✅ Using domain from agent details:", agentDomain);
      }
    }
  } catch (error) {
    console.warn("Agent details fetch failed:", error);
  }

  // If no domain from agent details, fallback to current domain
  if (!agentDomain) {
    const { currentDomain } = getDomainInfo();
    agentDomain = currentDomain;
    console.log("⚠️ Falling back to current domain:", agentDomain);
  }

  // Frontend session ID (for UI state management only - NOT sent to backend)
  const frontendSessionId = getOrCreateSessionId();
  console.log("Frontend session ID (UI only):", frontendSessionId);

  // Backend session ID (from server - used for ALL API/socket calls)
  let backendSessionId = getBackendSessionId();

  // Fetch chatbot history using domain from agent details
  try {
    const historyResult = await fetchChatbotHistory(
      agentDomain,
      batch_id,
      user_uuid,
      visitorId
    );

    console.log("Chatbot history fetched:", historyResult);

    // ALWAYS use session ID from server response for backend communication
    if (historyResult.session_id) {
      backendSessionId = historyResult.session_id;
      // Store backend session ID separately
      setBackendSessionId(backendSessionId);
      console.log("Backend session ID (for API/Socket):", backendSessionId);
    }
  } catch (error) {
    console.warn("Chatbot history fetch failed:", error);
  }

  // If no backend session ID from server, generate one (fallback)
  if (!backendSessionId) {
    backendSessionId = getOrCreateSessionId();
    setBackendSessionId(backendSessionId);
    console.log("Generated fallback backend session ID:", backendSessionId);
  }

  // Build socket URL using BACKEND session ID and domain from agent details
  const socketUrl = buildSocketUrl(
    publish_id,
    user_uuid,
    backendSessionId,
    payload.token_id,
    visitorId,
    agentDomain
  );

  console.log("Socket URL:", socketUrl);

  // Return widget configuration with agent data
  return {
    config: {
      publishId: publish_id,
      userId: user_uuid,
      tokenId: payload.token_id,
      ownerId: owner_uuid,
      batchId: batch_id,
    },
    socketUrl,
    agentData: fetchedAgentData,
  };
};
