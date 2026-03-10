// components/common/TabNavigation.tsx
import React from "react";

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  buttonClassName?: string;
  /**
   * Optional wrapper div className.
   * - Pass "sidebar-nav" for fullscreen sidebar (vertical layout)
   * - Leave empty for compact header tabs (no wrapper — parent div handles layout)
   */
  wrapperClassName?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  buttonClassName,
  wrapperClassName,
}: TabNavigationProps) {
  const buttons = tabs.map((tab) => (
    <button
      key={tab.key}
      type="button"
      className={`tab-button${buttonClassName ? ` ${buttonClassName}` : ""} ${activeTab === tab.key ? "active" : ""}`}
      onClick={tab.onClick}
    >
      {tab.icon}
      <span>{tab.label}</span>
    </button>
  ));

  // If wrapperClassName given (e.g. sidebar-nav), wrap in a div
  // Otherwise render buttons directly — parent wrapper handles layout
  if (wrapperClassName) {
    return <div className={wrapperClassName}>{buttons}</div>;
  }

  return <>{buttons}</>;
}
