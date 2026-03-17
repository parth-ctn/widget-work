import ReactDOM from "react-dom/client";
import ChatWidget from "./components/ChatWidget";
import { VisitorProvider } from "./contexts/VisitorContext";
import type { InitConfig } from "./types/index";
import { WIDGET_CONFIG } from "./config/constants";
import styleContent from "./styles.scss?inline";
import katexCss from "katex/dist/katex.min.css?inline";

// Prevent multiple initializations
let isInitialized = false;
let rootInstance: ReactDOM.Root | null = null;

function init(config: InitConfig = {}) {
  console.log("🚀 ChatWidget.init called with config:", config);

  if (isInitialized) {
    console.warn(
      "⚠️ ChatWidget already initialized, skipping duplicate init call",
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
      WIDGET_CONFIG.CONTAINER_ID,
    );

    // Inject app styles into shadow DOM
    const style = document.createElement("style");
    style.textContent = styleContent;
    config.shadowRoot.appendChild(style);

    // KaTeX CSS → shadow DOM
    const katexStyle = document.createElement("style");
    katexStyle.textContent = katexCss;
    config.shadowRoot.appendChild(katexStyle);

    // KaTeX @font-face → document.head (shadow DOM fonts support નથી)
    if (!document.getElementById("katex-fonts-injected")) {
      const katexFontStyle = document.createElement("style");
      katexFontStyle.id = "katex-fonts-injected";
      katexFontStyle.textContent = `
        @font-face { font-family: 'KaTeX_Main'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Main'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Bold.woff2') format('woff2'); font-weight: bold; font-style: normal; }
        @font-face { font-family: 'KaTeX_Main'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Main-Italic.woff2') format('woff2'); font-weight: normal; font-style: italic; }
        @font-face { font-family: 'KaTeX_Math'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Math-Italic.woff2') format('woff2'); font-weight: normal; font-style: italic; }
        @font-face { font-family: 'KaTeX_Size1'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Size1-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Size2'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Size2-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Size3'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Size3-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Size4'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Size4-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_AMS'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_AMS-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Caligraphic'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Caligraphic-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Fraktur'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Fraktur-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_SansSerif'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_SansSerif-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Script'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Script-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
        @font-face { font-family: 'KaTeX_Typewriter'; src: url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/KaTeX_Typewriter-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
      `;
      document.head.appendChild(katexFontStyle);
    }

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
    </VisitorProvider>,
  );

  isInitialized = true;
  console.log("✅ React app rendered and marked as initialized");
}

window.ChatWidget = { init };
