import type { WidgetConfig, InitConfig } from './types/index';

declare global {
  interface Window {
    WEBMAP_WIDGET_CONFIG?: WidgetConfig;
    ChatWidget: {
      init: (config?: InitConfig) => void;
    };
  }
}

export {};
