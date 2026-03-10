// components/common/SearchInput.tsx
// Reusable search input with leading Search icon
// Used in: ChatHistoryList
// Can be reused in any future search UI inside the widget

import React from "react";
import { Search } from "lucide-react";
import type { ChangeEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional className override for the input element */
  inputClassName?: string;
  /** Optional className for the outer wrapper */
  wrapperClassName?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  inputClassName,
  wrapperClassName,
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={wrapperClassName ?? "chat-history-search"}>
      <div className="position-relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputClassName ?? "history-search-input"}
        />
        <span className="search-icon">
          <Search />
        </span>
      </div>
    </div>
  );
}
