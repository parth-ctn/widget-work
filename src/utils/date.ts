/**
 * Formats a timestamp for display
 */
export const formatTimestamp = (date: Date = new Date()): string => {
  const pad2 = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const formatTimestampFromString = (value?: string | null): string => {
  if (!value) {
    return formatTimestamp(new Date());
  }

  // If it's already in our target format, keep it as-is.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const tryParse = (input: string) => {
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const direct = tryParse(value);
  if (direct) {
    return formatTimestamp(direct);
  }

  // Handle strings like "December 12th at 12:27 PM"
  const cleaned = value
    .replace(/(\d+)(st|nd|rd|th)\b/gi, "$1")
    .replace(/\bat\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const cleanedParsed = tryParse(cleaned);
  if (cleanedParsed) {
    return formatTimestamp(cleanedParsed);
  }

  return formatTimestamp(new Date());
};
