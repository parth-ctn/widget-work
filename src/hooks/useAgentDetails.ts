import { useState, useEffect } from "react";
import { fetchAgentDetails, savePublishAgent } from "../services/api";
import type { AgentData } from "../types/index";

/**
 * Fetches the user's IP address
 */
const getIP = async (): Promise<string> => {
  try {
    const API_VERIFY_IP_URL = import.meta.env.VITE_API_VERIFY_IP_URL;
    const res = await fetch(API_VERIFY_IP_URL);
    const text = await res.text();

    // .trim() removes the trailing \n and any surrounding whitespace
    return text.trim();
  } catch {
    return "";
  }
};

const normalizeCollectionNames = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim());
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => typeof item === "string" && item.trim()
        );
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

/**
 * Custom hook to fetch and manage agent details
 * @param userId - User UUID
 * @param agentId - Agent/Publish ID
 * @param initialData - Optional pre-fetched agent data to avoid duplicate API calls
 */
export const useAgentDetails = (
  userId?: string,
  agentId?: string,
  initialData?: AgentData
) => {
  const [agentData, setAgentData] = useState<AgentData>(() => {
    if (initialData) {
      return {
        ...initialData,
        mongo_db_rag_collection_name: normalizeCollectionNames(
          initialData.mongo_db_rag_collection_name
        ),
      };
    }

    return {
      title: "",
      description: "",
      conversation_starters: [],
      publish_agent_profile: undefined,
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !agentId) return;

    const loadAgentDetails = async () => {
      // Skip fetching if we already have initial data
      if (!initialData) {
        setLoading(true);
        setError(null);

        try {
          const data = await fetchAgentDetails(userId, agentId);
          console.log("✅ Agent Data received:", data);

          // Handle both response formats: direct array or wrapped in results
          const agentArray = Array.isArray(data) ? data : data.results;

          if (agentArray && agentArray.length > 0) {
            setAgentData({
              title: agentArray[0].title || "",
              description: agentArray[0].description || "",
              conversation_starters: agentArray[0].conversation_starters || [],
              milvus_collection: agentArray[0].milvus_collection,
              publish_agent_profile: agentArray[0].publish_agent_profile,
              domain: agentArray[0].domain,
              mongo_db_rag_collection_name: normalizeCollectionNames(
                agentArray[0].mongo_db_rag_collection_name
              ),
            });
          }
        } catch (err) {
          console.error("❌ Error fetching agent details:", err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("✅ Using cached agent data, skipping fetch API call");
      }

      // Always call save-publish-agent API (regardless of cached data)
      const config = window.WEBMAP_WIDGET_CONFIG;
      const visitorId = localStorage.getItem("webmap_visitor_id");

      if (config && visitorId) {
        try {
          // Fetch the current IP address
          const userIp = await getIP();

          await savePublishAgent({
            publish_id: config.publishId,
            // user_uuid: null,
            visitor_id: visitorId,
            is_widget: true,
            ip: userIp,
          });
          console.log(
            "✅ Save publish agent called successfully with IP:",
            userIp
          );
        } catch (apiError) {
          console.error("❌ Failed to call save publish agent:", apiError);
          // Don't throw error, just log it
        }
      }
    };

    loadAgentDetails();
  }, [userId, agentId, initialData]);

  return { agentData, loading, error };
};
