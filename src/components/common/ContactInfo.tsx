// components/common/ContactInfo.tsx
// Reusable contact info — renders phone and/or email
// Two display modes:
//   "list"    → vertical list with labels (fullscreen profile card)
//   "buttons" → small icon-only action buttons (compact home tab)

import React from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────

const PhoneIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.21144 7.1471C7.85857 6.79873 7.41805 6.79873 7.06743 7.1471C6.79997 7.41231 6.53251 7.67752 6.26954 7.94723C6.19762 8.0214 6.13693 8.03713 6.04928 7.98769C5.87622 7.89329 5.69192 7.81687 5.5256 7.71348C4.75019 7.22576 4.10064 6.59869 3.52526 5.89296C3.23982 5.54234 2.98585 5.16699 2.80829 4.74445C2.77233 4.65905 2.77907 4.60286 2.84875 4.53318C3.11621 4.27471 3.37693 4.0095 3.63989 3.74429C4.00624 3.37569 4.00624 2.94415 3.63764 2.57331C3.42862 2.36204 3.2196 2.15526 3.01057 1.94399C2.79481 1.72822 2.58129 1.51021 2.36327 1.29669C2.01041 0.952813 1.56988 0.952813 1.21926 1.29894C0.949557 1.56415 0.691087 1.83611 0.416884 2.09682C0.162909 2.33731 0.0347982 2.63174 0.00782742 2.97562C-0.0348763 3.53526 0.102225 4.06344 0.295516 4.57813C0.691087 5.64348 1.29343 6.5897 2.02389 7.45726C3.01057 8.63049 4.1883 9.55873 5.56605 10.2285C6.18638 10.5297 6.82918 10.7612 7.52818 10.7994C8.00915 10.8264 8.4272 10.705 8.76209 10.3296C8.99134 10.0734 9.24981 9.83968 9.49255 9.59469C9.85216 9.23059 9.8544 8.79007 9.49704 8.43046C9.07 8.00117 8.64072 7.57413 8.21144 7.1471Z"
      fill="#5D5FEF"
    />
  </svg>
);

const EmailIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={(size * 9) / 12}
    viewBox="0 0 12 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.9453 0H1.05469C0.474328 0 0 0.472242 0 1.05469V7.38281C0 7.96547 0.474633 8.4375 1.05469 8.4375H10.9453C11.5257 8.4375 12 7.96526 12 7.38281V1.05469C12 0.472102 11.5254 0 10.9453 0ZM10.7834 0.703125C10.4424 1.04524 6.43699 5.06367 6.27244 5.22877C6.135 5.36662 5.86507 5.36672 5.72756 5.22877L1.21664 0.703125H10.7834ZM0.703125 7.25355V1.18395L3.72809 4.21875L0.703125 7.25355ZM1.21664 7.73438L4.22447 4.71675L5.22959 5.72515C5.64148 6.13838 6.35869 6.13821 6.77044 5.72515L7.77555 4.71677L10.7834 7.73438H1.21664ZM11.2969 7.25355L8.27191 4.21875L11.2969 1.18395V7.25355Z"
      fill="#5D5FEF"
    />
  </svg>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface ContactInfoProps {
  contactNumber?: string;
  email?: string;
  /** "list" = vertical labeled list (fullscreen); "buttons" = icon-only action buttons (compact) */
  mode?: "list" | "buttons";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContactInfo({
  contactNumber,
  email,
  mode = "buttons",
}: ContactInfoProps) {
  if (!contactNumber && !email) return null;

  if (mode === "list") {
    return (
      <div className="contact-info-list">
        {contactNumber && (
          <div className="contact-info-item">
            <span className="contact-icon">
              <PhoneIcon size={14} />
            </span>
            <a href={`tel:${contactNumber}`} className="contact-text">
              {contactNumber}
            </a>
          </div>
        )}
        {email && (
          <div className="contact-info-item">
            <span className="contact-icon">
              <EmailIcon size={14} />
            </span>
            <a href={`mailto:${email}`} className="contact-text">
              {email}
            </a>
          </div>
        )}
      </div>
    );
  }

  // mode === "buttons" — compact icon-only action buttons
  return (
    <div className="contact-action-buttons">
      {contactNumber && (
        <a
          href={`tel:${contactNumber}`}
          className="contact-action-btn call-btn"
          title={`Call ${contactNumber}`}
        >
          <PhoneIcon size={12} />
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="contact-action-btn email-btn"
          title={`Email ${email}`}
        >
          <EmailIcon size={12} />
        </a>
      )}
    </div>
  );
}
