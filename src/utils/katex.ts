

// import katex from "katex";

// function tryKatex(expr: string, displayMode: boolean): string | null {
//   try {
//     return katex.renderToString(expr, {
//       displayMode,
//       throwOnError: false,
//       strict: false,
//       trust: true,
//     });
//   } catch {
//     return null;
//   }
// }

// function simpleFallback(t: string): string {
//   t = t.replace(
//     /(\([^)]*\)|[a-zA-Z0-9])\^\{([^}]{1,40})\}/g,
//     (_, b, e) => `${b}<sup>${e}</sup>`,
//   );
//   t = t.replace(
//     /(\([^)]*\)|[a-zA-Z0-9])\^(\d+|[a-zA-Z])/g,
//     (_, b, e) => `${b}<sup>${e}</sup>`,
//   );
//   t = t.replace(
//     /([a-zA-Z0-9])_\{([^}]{1,40})\}/g,
//     (_, b, s) => `${b}<sub>${s}</sub>`,
//   );
//   t = t.replace(
//     /([a-zA-Z0-9])_([a-zA-Z0-9])/g,
//     (_, b, s) => `${b}<sub>${s}</sub>`,
//   );
//   return t;
// }

// export function renderMathInHtml(text: string): string {
//   if (!text) return text;

//   let result = text;

//   // ── Step 0: Clean up <br> artifacts from bot ─────────────────────────────
//   // Bot sometimes sends literal "<br>" text or "\n" newlines
//   // Convert \n to <br> first
//   result = result.replace(/\r?\n/g, "<br>");
//   // Remove duplicate <br><br> (optional, keeps it clean)
//   result = result.replace(/(<br>\s*){3,}/gi, "<br><br>");

//   // ── Pass 1: $$ block math ─────────────────────────────────────────────────
//   // Strip <br> inside math blocks before rendering
//   result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
//     const clean = expr.replace(/<br>/gi, "\n").trim();
//     const rendered = tryKatex(clean, false);
//     return rendered
//       ? `<span class="math-block">${rendered}</span>`
//       : simpleFallback(clean);
//   });

//   // ── Pass 2: $ inline math ─────────────────────────────────────────────────
//   result = result.replace(/\$([^$\n<]+?)\$/g, (_, expr) => {
//     const clean = expr.replace(/<br>/gi, " ").trim();
//     const rendered = tryKatex(clean, false);
//     return rendered ? rendered : simpleFallback(clean);
//   });

//   // ── Pass 3: Plain caret/underscore (no $ markers) ─────────────────────────
//   result = result.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, t) => {
//     if (tag) return tag;
//     if (!t) return t ?? "";
//     if (/[\\]/.test(t)) return t;
//     if (/[\^_]/.test(t)) return simpleFallback(t);
//     return t;
//   });

//   return result;
// }


import katex from "katex";

function tryKatex(expr: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch {
    return null;
  }
}

function simpleFallback(t: string): string {
  t = t.replace(/(\([^)]*\)|[a-zA-Z0-9])\^\{([^}]{1,40})\}/g, (_, b, e) => `${b}<sup>${e}</sup>`);
  t = t.replace(/(\([^)]*\)|[a-zA-Z0-9])\^(\d+|[a-zA-Z])/g, (_, b, e) => `${b}<sup>${e}</sup>`);
  t = t.replace(/([a-zA-Z0-9])_\{([^}]{1,40})\}/g, (_, b, s) => `${b}<sub>${s}</sub>`);
  t = t.replace(/([a-zA-Z0-9])_([a-zA-Z0-9])/g, (_, b, s) => `${b}<sub>${s}</sub>`);
  return t;
}

// Detect bare LaTeX expressions NOT wrapped in $ and wrap them
function prewrapLatex(text: string): string {
  // Match patterns like \sum_{...}^{...}, \frac{}{}, \int, etc.
  // that appear outside of $...$ delimiters
  const latexCommands = /\\(?:sum|frac|int|prod|lim|sqrt|left|right|binom|infty|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|partial|nabla|cdot|times|div|pm|leq|geq|neq|approx|equiv|forall|exists|in|notin|subset|cup|cap|mathbb|mathbf|text|overline|underline|hat|vec|dot|ddot)\b/;

  // Split by lines, process each line
  return text.split('\n').map(line => {
    // Skip if already has $ delimiters
    if (/\$/.test(line)) return line;
    
    // If line contains LaTeX commands or patterns like \sum_{i=1}^{n}
    if (latexCommands.test(line) || /[a-zA-Z0-9]\^[\{a-zA-Z0-9]/.test(line)) {
      // Try to render the whole line as math
      // But only wrap the LaTeX parts, not Hindi/normal text
      // Strategy: wrap sequences that look like math expressions
      line = line.replace(
        /((?:\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*(?:_\{[^}]*\}|\^\{[^}]*\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9])*)+(?:\s*[=<>+\-*/]\s*(?:\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*(?:_\{[^}]*\}|\^\{[^}]*\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9])*|\d+(?:\.\d+)?|[a-zA-Z]))*)/g,
        (match) => {
          const trimmed = match.trim();
          if (!trimmed || trimmed.length < 2) return match;
          const rendered = tryKatex(trimmed, false);
          return rendered ? rendered : simpleFallback(trimmed);
        }
      );
    }
    return line;
  }).join('\n');
}

export function renderMathInHtml(text: string): string {
  if (!text) return text;

  let result = text;

  // Step 0: Pre-wrap bare LaTeX BEFORE converting \n to <br>
  result = prewrapLatex(result);

  // Convert newlines to <br>
  result = result.replace(/\r?\n/g, "<br>");
  result = result.replace(/(<br>\s*){3,}/gi, "<br><br>");

  // Pass 1: $$ block math
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, "\n").trim();
    const rendered = tryKatex(clean, false);
    return rendered
      ? `<span class="math-block">${rendered}</span>`
      : simpleFallback(clean);
  });

  // Pass 2: $ inline math
  result = result.replace(/\$([^$\n<]+?)\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, " ").trim();
    const rendered = tryKatex(clean, false);
    return rendered ? rendered : simpleFallback(clean);
  });

  // Pass 3: Plain caret/underscore fallback
  result = result.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, t) => {
    if (tag) return tag;
    if (!t) return t ?? "";
    if (/[\\]/.test(t)) return t;
    if (/[\^_]/.test(t)) return simpleFallback(t);
    return t;
  });

  return result;
}