import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { getDeviceFingerprint } from "../services/deviceFingerprint";

interface VisitorContextType {
  visitorId: string;
  requestId: string;
  isLoading: boolean;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

const VISITOR_ID_KEY = "webmap_visitor_id";
const REQUEST_ID_KEY = "webmap_request_id";

interface VisitorProviderProps {
  children: ReactNode;
}

export function VisitorProvider({ children }: VisitorProviderProps) {
  const [visitorId, setVisitorId] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeVisitorId = async () => {
      try {
        // VisitorId should already be set in localStorage by embed.ts
        // This context just reads from it as the single source of truth
        const cachedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
        const cachedRequestId = localStorage.getItem(REQUEST_ID_KEY);

        if (cachedVisitorId && cachedRequestId) {
          console.log("✅ VisitorContext: Using visitorId from localStorage:", cachedVisitorId);
          setVisitorId(cachedVisitorId);
          setRequestId(cachedRequestId);
          setIsLoading(false);
          return;
        }

        // Fallback: If not in localStorage, generate it (for standalone mode)
        console.log("⚠️ VisitorContext: No visitorId in localStorage, generating new one...");
        const result = await getDeviceFingerprint();

        console.log("✅ Device fingerprint obtained:", result);

        // Store in state
        setVisitorId(result.visitorId);
        setRequestId(result.requestId);

        // Persist to localStorage
        localStorage.setItem(VISITOR_ID_KEY, result.visitorId);
        localStorage.setItem(REQUEST_ID_KEY, result.requestId);

        console.log("✅ VisitorId stored in localStorage");
      } catch (error) {
        console.error("❌ Error initializing visitorId:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeVisitorId();
  }, []);

  return (
    <VisitorContext.Provider value={{ visitorId, requestId, isLoading }}>
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error("useVisitor must be used within a VisitorProvider");
  }
  return context;
}
