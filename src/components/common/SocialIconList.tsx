// components/common/SocialIconsList.tsx
// Reusable social media icon list
// Used in: ChatWidget home tab (compact view) and fullscreen agent profile card
// Both render identical <ul> with social icon <a> links

import React from "react";

interface SocialLink {
  type: string;
  link: string;
}

interface SocialIconsListProps {
  socialLinks: SocialLink[];
  /** Base URL for social icon SVG files, e.g. "https://widget.example.com/" */
  iconBaseUrl: string;
  /** Optional className for the <ul> */
  className?: string;
}

export default function SocialIconsList({
  socialLinks,
  iconBaseUrl,
  className,
}: SocialIconsListProps) {
  if (!socialLinks.length) return null;

  return (
    <ul className={className ?? "social-icons-list"}>
      {socialLinks.map((social, index) => (
        <li key={`${social.type}-${index}`}>
          <a
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon-link"
            title={social.type}
          >
            <img
              src={`${iconBaseUrl}social-icons/${social.type}.svg`}
              alt={social.type}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
