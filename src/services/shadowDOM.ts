import { WIDGET_CONFIG } from "../config/constants";

/**
 * Creates shadow DOM host element
 */
export const createShadowHost = (): HTMLDivElement => {
  const shadowHost = document.createElement("div");
  shadowHost.id = WIDGET_CONFIG.SHADOW_HOST_ID;
  document.body.appendChild(shadowHost);
  return shadowHost;
};

/**
 * Creates shadow root with isolated styles
 */
export const createShadowRoot = (host: HTMLDivElement): ShadowRoot => {
  return host.attachShadow({ mode: "closed" });
};

/**
 * Creates widget container inside shadow root
 */
export const createWidgetContainer = (
  shadowRoot: ShadowRoot
): HTMLDivElement => {
  const widgetContainer = document.createElement("div");
  widgetContainer.id = WIDGET_CONFIG.CONTAINER_ID;
  shadowRoot.appendChild(widgetContainer);
  return widgetContainer;
};
