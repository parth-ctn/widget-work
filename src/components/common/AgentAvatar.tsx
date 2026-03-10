// components/common/AgentAvatar.tsx
// Reusable agent avatar — shows profile image or fallback SVG icon
// Used in: ChatWidget bubble, chat header, home tab (compact + fullscreen),
//          agent profile card
//
// Size variants:
//   "bubble"  → 56×56  (chat bubble button)
//   "header"  → 32×32  (chat window header)
//   "profile" → custom via className (home tab profile image)
//   "small"   → 24×24  (fallback placeholder)

import React from "react";

interface AgentAvatarProps {
  /** URL of agent profile image */
  src?: string | null;
  /** Alt text for image */
  alt?: string;
  /** Size variant */
  size?: "bubble" | "header" | "profile" | "small";
  /** Extra className for the wrapper */
  className?: string;
  /** Extra className for the img tag */
  imgClassName?: string;
}

// Fallback chat-bubble SVG icon
const FallbackChatIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Large brand SVG used in the floating bubble when no profile image
const BubbleFallbackIcon = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_agent_bubble)">
      <path
        d="M29.0829 34.2844C24.8254 34.2844 21.374 30.7168 21.374 26.316C21.374 21.9152 24.8254 18.3477 29.0829 18.3477C33.3403 18.3477 36.7914 21.9152 36.7914 26.316C36.7914 30.7168 33.3403 34.2844 29.0829 34.2844Z"
        fill="white"
      />
      <path
        d="M30.2457 54.9133C22.6711 33.9068 25.8577 14.333 28.3982 7.17156C20.7774 6.45548 9 13.378 9 26.7459C9 37.4398 16.5437 43.2961 20.3155 44.8876C18.3912 43.8529 14.2652 39.9225 13.1566 32.4747C11.7713 23.1651 17.5445 18.8684 21.0085 17.1973C19.8536 26.507 22.163 36.7715 24.0105 41.5454C25.8577 46.3197 26.0888 46.7972 30.2457 54.9133Z"
        fill="white"
      />
      <path
        d="M25.3369 26.6836H23.1553C23.224 27.9218 23.6468 29.0904 24.3735 30.0644C24.7823 29.8255 25.2414 29.621 25.737 29.4542C25.5012 28.6023 25.3641 27.6617 25.3369 26.6836Z"
        fill="#5D5FEF"
      />
      <path
        d="M25.3369 25.9629C25.3641 24.9851 25.5012 24.0442 25.737 23.1922C25.2414 23.0255 24.7823 22.8209 24.3735 22.582C23.6468 23.5561 23.224 24.7246 23.1553 25.9629H25.3369Z"
        fill="#5D5FEF"
      />
      <path
        d="M33.0352 8.02734C36.9457 9.28275 40.3375 11.8535 42.6722 15.3309C45.0069 18.8082 46.1495 22.9926 45.9194 27.2185C45.6886 31.4444 44.0984 35.4695 41.4005 38.6536C38.703 41.8377 35.0526 43.9984 31.0305 44.7916L30.2822 40.7384C33.43 40.1176 36.2865 38.4268 38.3976 35.9351C40.509 33.4433 41.7534 30.2936 41.9339 26.9864C42.1141 23.6793 41.2197 20.4046 39.3928 17.6833C37.5659 14.962 34.9115 12.9503 31.8512 11.9678L33.0352 8.02734Z"
        fill="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_agent_bubble">
        <rect width="56" height="56" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default function AgentAvatar({
  src,
  alt = "Agent",
  size = "header",
  className,
  imgClassName,
}: AgentAvatarProps) {
  if (size === "bubble") {
    return src ? (
      <img
        src={src}
        alt={alt}
        className={imgClassName ?? "bubble-agent-avatar"}
      />
    ) : (
      <BubbleFallbackIcon />
    );
  }

  const fallbackSize = size === "profile" ? 24 : size === "header" ? 24 : 16;

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={
          imgClassName ??
          (size === "profile" ? "agent-profile-image" : "agent-avatar-img")
        }
      />
    );
  }

  // Fallback wrapper
  const wrapperClass =
    size === "profile" ? "agent-profile-placeholder" : "agent-avatar-fallback";

  return (
    <div className={`${wrapperClass}${className ? ` ${className}` : ""}`}>
      <FallbackChatIcon size={fallbackSize} />
    </div>
  );
}
