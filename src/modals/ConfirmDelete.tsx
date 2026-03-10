// components/common/ConfirmDeleteModal.tsx
// Reusable confirmation modal for destructive actions
// Currently used in: ChatHistoryList (delete session)
// Can be reused for: any future delete/destructive confirmation in the widget
//
// Shows an overlay + centered dialog with:
//   - Title
//   - Body message
//   - Optional error
//   - Cancel + Confirm (danger) buttons

import React from "react";

interface ConfirmDeleteModalProps {
  /** Modal heading */
  title?: string;
  /** Descriptive body text */
  body: string;
  /** Optional error message shown in red above the action buttons */
  errorMessage?: string | null;
  /** Label for the confirm/danger button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Whether the confirm action is in progress (shows loading label) */
  isConfirming?: boolean;
  /** Label shown while confirming */
  confirmingLabel?: string;
  /** Called when cancel / overlay clicked */
  onCancel: () => void;
  /** Called when confirm button clicked */
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  title = "Delete this item?",
  body,
  errorMessage,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isConfirming = false,
  confirmingLabel = "Deleting...",
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div
      className="history-delete-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="history-delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" id="confirm-modal-title">
          {title}
        </div>

        <div className="modal-body">{body}</div>

        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-button secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="modal-button danger"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
