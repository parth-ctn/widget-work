import ReactDOM from "react-dom/client";
import ChatWidget from "./components/ChatWidget";
import { VisitorProvider } from "./contexts/VisitorContext";
import type { InitConfig } from "./types/index";
import { WIDGET_CONFIG } from "./config/constants";
import styleContent from "./styles.scss?inline"; // Import styles as string

// Prevent multiple initializations
let isInitialized = false;
let rootInstance: ReactDOM.Root | null = null;

function init(config: InitConfig = {}) {
  console.log("🚀 ChatWidget.init called with config:", config);

  // Prevent multiple initializationsd
  if (isInitialized) {
    console.warn(
      "⚠️ ChatWidget already initialized, skipping duplicate init call"
    );
    return; 
  }

  const agentId = config.publishId || window.WEBMAP_WIDGET_CONFIG?.publishId;
  const userId = config.userId || window.WEBMAP_WIDGET_CONFIG?.userId;
  const batchId = config.batchId || window.WEBMAP_WIDGET_CONFIG?.batchId;

  if (!agentId) {
    console.error("ChatWidget: agentId is required but not provided");
    return;
  }

  let container: HTMLElement | null = null;

  // Priority 1: If shadow root is provided, look for container inside shadow DOM
  if (config.shadowRoot) {
    console.log(
      "🔍 Looking for container in shadow DOM with ID:",
      WIDGET_CONFIG.CONTAINER_ID
    );

    // Inject styles into shadow DOM
    const style = document.createElement("style");
    style.textContent = styleContent;
    config.shadowRoot.appendChild(style);
    console.log("✅ Styles injected into shadow DOM");

    container = config.shadowRoot.getElementById(WIDGET_CONFIG.CONTAINER_ID);
    if (container) {
      console.log("✅ Found container in Shadow DOM:", container);
    } else {
      console.warn("❌ Container not found in shadow DOM");
    }
  }

  // Priority 2: Fallback to regular DOM containers
  if (!container) {
    container = document.getElementById(WIDGET_CONFIG.CHAT_WIDGET_ROOT_ID);
    if (!container) {
      container = document.getElementById(WIDGET_CONFIG.CONTAINER_ID);
    }
  }

  // Priority 3: Create new container in regular DOM (fallback)
  if (!container) {
    console.log("Creating fallback container in regular DOM");
    container = document.createElement("div");
    container.id = WIDGET_CONFIG.CHAT_WIDGET_ROOT_ID;
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  if (!container) {
    console.error("ChatWidget: Failed to create or find container element");
    return;
  }

  console.log("✅ Container found/created:", container);
  console.log("✅ test for new save-agent api...");

  const root = ReactDOM.createRoot(container);
  rootInstance = root;
  root.render(
    <VisitorProvider>
      <ChatWidget
        agentId={agentId}
        socketUrl={config.socketUrl}
        userId={userId}
        batchId={batchId}
        agentData={config.agentData}
      />
    </VisitorProvider>
  );

  isInitialized = true;
  console.log("✅ React app rendered and marked as initialized");
}

window.ChatWidget = { init };
