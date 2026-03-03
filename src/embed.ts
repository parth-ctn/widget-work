import { getScriptParams, validateScriptParams } from "./utils/urlParams";
import { getDomainInfo } from "./utils/domain";
import { initializeWidget } from "./services/widget";
import {
  createShadowHost,
  createShadowRoot,
  createWidgetContainer,
} from "./services/shadowDOM";
import { WIDGET_DOMAIN } from "./config/constants";
import { getDeviceFingerprint } from "./services/deviceFingerprint";

const VISITOR_ID_KEY = "webmap_visitor_id";
const REQUEST_ID_KEY = "webmap_request_id";

/**
 * Gets or creates visitorId - single source of truth initialization
 */
async function getOrCreateVisitorId(): Promise<string> {
  // Check if we already have visitorId in localStorage
  const cachedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
  const cachedRequestId = localStorage.getItem(REQUEST_ID_KEY);

  if (cachedVisitorId && cachedRequestId) {
    console.log("✅ Using cached visitorId:", cachedVisitorId);
    return cachedVisitorId;
  }

  // If not cached, generate new fingerprint
  console.log("🔍 Generating new device fingerprint...");
  const result = await getDeviceFingerprint();

  if (result.visitorId) {
    // Store in localStorage
    localStorage.setItem(VISITOR_ID_KEY, result.visitorId);
    localStorage.setItem(REQUEST_ID_KEY, result.requestId);
    console.log("✅ New visitorId created and stored:", result.visitorId);
    return result.visitorId;
  }

  throw new Error("Failed to generate visitorId");
}

(async function () {
  // Extract and validate script parameters
  const params = getScriptParams();
  if (!validateScriptParams(params)) {
    return;
  }

  const { agentId, tokenId, ownerId } = params;
  const { currentDomain } = getDomainInfo();

  console.log("currentDomain==>", currentDomain);

  try {
    // Initialize visitorId early - this is the single source of truth
    const visitorId = await getOrCreateVisitorId();
    console.log("✅ VisitorId ready:", visitorId);

    // Initialize widget (policy check + history fetch + agent details)
    const { config, socketUrl, agentData } = await initializeWidget(
      {
        user_uuid: ownerId!,
        token_id: tokenId!,
        publish_id: agentId!,
        domain: currentDomain,
      },
      visitorId
    );

    console.log("Widget initialized:", config);
    console.log("Agent data cached:", agentData);

    // Set global config
    window.WEBMAP_WIDGET_CONFIG = config;

    // Create Shadow DOM structure
    const shadowHost = createShadowHost();
    const shadowRoot = createShadowRoot(shadowHost);
    createWidgetContainer(shadowRoot);

    // CSS is now bundled in chat-widget.js, no need to load separately
    // await loadShadowCSS(shadowRoot);

    const script = document.createElement("script");
    script.src = `${WIDGET_DOMAIN}chat-widget.js`;
    script.async = true;
    script.onload = function () {
      if (window.ChatWidget) {
        window.ChatWidget.init({
          publishId: config.publishId,
          userId: config.userId,
          tokenId: config.tokenId,
          ownerId: config.ownerId,
          batchId: config.batchId,
          socketUrl: socketUrl,
          shadowRoot: shadowRoot,
          agentData: agentData,
        });
      }
    };
    document.body.appendChild(script);
  } catch (error) {
    console.error("Error initializing widget:", error);
    return;
  }
})();
