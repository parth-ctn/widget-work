import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked for common GitHub-style markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

let domPurifyConfigured = false;
const configureDomPurify = () => {
  if (domPurifyConfigured) return;
  domPurifyConfigured = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName !== "A") return;

    const href = node.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  });
};

const extractImageUrls = (markdown: string): string[] => {
  if (!markdown) return [];

  const combinedRegex = /!\[.*?\]\((.*?)\)|<img.*?src=["'](.*?)["'].*?>/g;
  const matches = [...markdown.matchAll(combinedRegex)];
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const imageUrl = match[1] || match[2];
    if (!imageUrl) continue;

    const cleanedUrl = imageUrl.split('"')[0].split(" ")[0].trim();
    if (!cleanedUrl || seen.has(cleanedUrl)) continue;

    seen.add(cleanedUrl);
    urls.push(cleanedUrl);
  }

  return urls;
};

const appendImageGallery = (doc: Document, imageUrls: string[]) => {
  if (!imageUrls.length) return;

  const wrapperContainer = doc.createElement("div");
  wrapperContainer.className = "image-gallery-wrapper";

  const label = doc.createElement("div");
  label.className = "block-label";
  label.textContent = "Extracted Images";
  wrapperContainer.appendChild(label);

  const imageContainer = doc.createElement("div");
  imageContainer.className = "image-gallery";

  imageUrls.forEach((url, index) => {
    const imgElement = doc.createElement("img");
    imgElement.src = url;
    imgElement.alt = `Extracted image ${index + 1}`;
    imageContainer.appendChild(imgElement);
  });

  wrapperContainer.appendChild(imageContainer);
  doc.body.appendChild(wrapperContainer);
};

/**
 * Convert Markdown to sanitized HTML for safe rendering in the chat UI.
 * Falls back to empty string if input is falsy.
 *
 * @param {string} markdown
 * @returns {Promise<string>} sanitized HTML
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  try {
    if (!markdown) return "";
    const rawHtml = await marked.parse(String(markdown));

    // Wrap tables so they can scroll horizontally on small containers.
    // (Prevents header text from collapsing into single-letter columns.)
    let htmlWithResponsiveTables = rawHtml;
    if (typeof window !== "undefined" && "DOMParser" in window) {
      try {
        const doc = new window.DOMParser().parseFromString(
          rawHtml,
          "text/html"
        );
        doc.querySelectorAll("table").forEach((table) => {
          const parent = table.parentNode;
          if (!parent) return;

          // Avoid double-wrapping if content already has a wrapper.
          if (
            parent instanceof HTMLElement &&
            parent.classList.contains("table-wrapper")
          ) {
            return;
          }

          const wrapper = doc.createElement("div");
          wrapper.className = "table-wrapper";
          parent.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        });

        const imageUrls = extractImageUrls(String(markdown));
        if (imageUrls.length > 0) {
          appendImageGallery(doc, imageUrls);
        }

        htmlWithResponsiveTables = doc.body.innerHTML;
      } catch {
        htmlWithResponsiveTables = rawHtml;
      }
    }

    // Sanitize to defend against any embedded HTML/script
    configureDomPurify();
    return DOMPurify.sanitize(htmlWithResponsiveTables, {
      ADD_ATTR: ["target", "rel"],
    });
  } catch {
    return "";
  }
}
