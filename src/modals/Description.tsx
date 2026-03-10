// components/modals/DescriptionModal.tsx
// Agent description full-text modal popup
// Used in: ChatWidget (home tab "read more" button)

import React from "react";

interface DescriptionModalProps {
  title: string;
  description: string;
  onClose: () => void;
}

export default function DescriptionModal({
  title,
  description,
  onClose,
}: DescriptionModalProps) {
  return (
    <div className="description-modal-overlay" onClick={onClose}>
      <div className="description-modal" onClick={(e) => e.stopPropagation()}>
        <div className="description-modal-content">
          <button className="description-modal-close" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h3 className="description-modal-title">About {title}</h3>
          <p
            className="description-modal-text"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </div>
  );
}
