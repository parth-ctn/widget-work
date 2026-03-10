// components/common/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel export for all shared/common UI components.
// Import from here instead of from individual files:
//
//   import { AgentAvatar, LoadingSpinner, TabNavigation } from "./common";
//   import type { TabItem } from "./common";
//
// For modals, use:
//   import { ConfirmDeleteModal, DescriptionModal } from "./modals";
//
// For hooks, use:
//   import { useCollectionActionStates, useImpressionTracking } from "../hooks";
// ─────────────────────────────────────────────────────────────────────────────

export { default as AgentAvatar } from "./AgentAvatar.tsx";
export { default as CollectionPagination } from "./CollectionPagination.tsx";
export { default as ContactInfo } from "./ContactInfo";
export { default as EmptyState } from "./EmptyState.tsx";
export { default as LoadingSpinner } from "./LoadinSpinner";
export { default as SearchInput } from "./SearchInput.tsx";
export { default as SocialIconsList } from "./SocialIconList.tsx";
export { default as TabNavigation } from "./TabNavigation.tsx";
export type { TabItem } from "./TabNavigation.tsx";
