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
//     (_, b, e) => b + "<sup>" + e + "</sup>",
//   );
//   t = t.replace(
//     /(\([^)]*\)|[a-zA-Z0-9])\^(\d+|[a-zA-Z])/g,
//     (_, b, e) => b + "<sup>" + e + "</sup>",
//   );
//   t = t.replace(
//     /([a-zA-Z0-9])_\{([^}]{1,40})\}/g,
//     (_, b, s) => b + "<sub>" + s + "</sub>",
//   );
//   t = t.replace(
//     /([a-zA-Z0-9])_([a-zA-Z0-9])/g,
//     (_, b, s) => b + "<sub>" + s + "</sub>",
//   );
//   return t;
// }

// const LATEX_COMMAND_RE =
//   /\\(?:sum|frac|int|prod|lim|sqrt|left|right|binom|infty|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|partial|nabla|cdot|times|div|pm|leq|geq|neq|approx|equiv|forall|exists|in|notin|subset|cup|cap|mathbb|mathbf|text|overline|underline|hat|vec|dot|ddot)\b/;

// function tryRenderLine(trimmed: string): string | null {
//   const r1 = tryKatex(trimmed, false);
//   if (r1) return r1;

//   const withDiff = trimmed.replace(
//     /\s+d([a-zA-Z])$/,
//     (_m: string, v: string) => "\\,d" + v,
//   );
//   if (withDiff !== trimmed) {
//     const r2 = tryKatex(withDiff, false);
//     if (r2) return r2;
//   }

//   const withText = trimmed.replace(
//     /\s+([a-zA-Z]+)$/,
//     (_m: string, w: string) => "\\,\\text{" + w + "}",
//   );
//   if (withText !== trimmed) {
//     const r3 = tryKatex(withText, false);
//     if (r3) return r3;
//   }

//   const withoutTrailing = trimmed.replace(/\s+[a-zA-Z]+$/, "").trim();
//   if (withoutTrailing !== trimmed && LATEX_COMMAND_RE.test(withoutTrailing)) {
//     const r4 = tryKatex(withoutTrailing, false);
//     if (r4) return r4;
//   }

//   return null;
// }

// export function renderMathInHtml(text: string): string {
//   if (!text) return text;

//   let result = text;

//   const hasHtmlTags = /<[a-zA-Z][^>]*>/.test(result);

//   // ── STEP 0: Pure bare LaTeX user input ONLY ───────────────────────────────
//   // Runs ONLY when:
//   //   1. No HTML tags
//   //   2. No $$ or $ delimiters — if $ present, it's AI response, skip to STEP 2
//   //   3. Has LaTeX commands
//   // Handles: \int_{0}^{\infty} x^2 dx  (user typed without $ wrapping)
//   const hasDollarDelimiters = /\$/.test(result);

//   if (!hasHtmlTags && !hasDollarDelimiters && LATEX_COMMAND_RE.test(result)) {
//     const lines = result.split("\n");
//     const rendered = lines.map((line) => {
//       const trimmed = line.trim();
//       if (!trimmed) return line;
//       if (!LATEX_COMMAND_RE.test(line)) return line;
//       const r = tryRenderLine(trimmed);
//       if (r) return r;
//       return line; // return as-is, no simpleFallback to avoid garbling
//     });

//     let out = rendered.join("\n");
//     out = out.replace(/\r?\n/g, "<br>");
//     out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
//     return out; // early return — STEP 1-4 never run
//   }

//   // ── STEP 1: newlines → <br> ───────────────────────────────────────────────
//   result = result.replace(/\r?\n/g, "<br>");
//   result = result.replace(/(<br>\s*){3,}/gi, "<br><br>");

//   // ── STEP 2: $$ block math (AI response uses this format) ──────────────────
//   result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_: string, expr: string) => {
//     const clean = expr.replace(/<br>/gi, "\n").trim();
//     const rendered = tryKatex(clean, true);
//     return rendered
//       ? '<span class="math-block">' + rendered + "</span>"
//       : simpleFallback(clean);
//   });

//   // ── STEP 3: $ inline math ─────────────────────────────────────────────────
//   result = result.replace(/\$([^$\n<]+?)\$/g, (_: string, expr: string) => {
//     const clean = expr.replace(/<br>/gi, " ").trim();
//     const rendered = tryKatex(clean, false);
//     return rendered ? rendered : simpleFallback(clean);
//   });

//   // ── STEP 4: ^ _ plain text fallback only (no LaTeX command processing) ────
//   result = result.replace(
//     /(<[^>]+>)|([^<]+)/g,
//     (_match: string, tag: string, t: string) => {
//       if (tag) return tag;
//       if (!t) return t ?? "";
//       if (/[\\]/.test(t)) return t; // has backslash — leave as-is
//       if (/[\^_]/.test(t)) return simpleFallback(t);
//       return t;
//     },
//   );

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
  t = t.replace(
    /(\([^)]*\)|[a-zA-Z0-9])\^\{([^}]{1,40})\}/g,
    (_, b, e) => b + "<sup>" + e + "</sup>"
  );
  t = t.replace(
    /(\([^)]*\)|[a-zA-Z0-9])\^(\d+|[a-zA-Z])/g,
    (_, b, e) => b + "<sup>" + e + "</sup>"
  );
  t = t.replace(
    /([a-zA-Z0-9])_\{([^}]{1,40})\}/g,
    (_, b, s) => b + "<sub>" + s + "</sub>"
  );
  t = t.replace(
    /([a-zA-Z0-9])_([a-zA-Z0-9])/g,
    (_, b, s) => b + "<sub>" + s + "</sub>"
  );
  return t;
}

const LATEX_COMMAND_RE =
  /\\(?:begin|end|sum|frac|int|iint|iiint|oint|prod|coprod|lim|sup|inf|sqrt|left|right|binom|infty|alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|Upsilon|phi|Phi|chi|psi|Psi|omega|Omega|partial|nabla|cdot|cdots|ddots|vdots|ldots|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|simeq|cong|propto|forall|exists|nexists|in|notin|subset|subseteq|supset|supseteq|cup|cap|setminus|emptyset|mathbb|mathbf|mathit|mathcal|mathsf|mathtt|mathrm|text|operatorname|overline|underline|overbrace|underbrace|hat|vec|dot|ddot|tilde|bar|widehat|widetilde|overrightarrow|overleftarrow|stackrel|xrightarrow|xleftarrow|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|to|gets|uparrow|downarrow|Uparrow|Downarrow|vert|Vert|lfloor|rfloor|lceil|rceil|langle|rangle|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|cases|aligned|align|gather|array|split|underset|overset|limits|displaystyle|textstyle|color|boxed|cancel|not|land|lor|neg|oplus|otimes|circ|bullet|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|det|dim|ker|deg|gcd|max|min|mod|bmod|pmod)\b/;

// ─── Already-rendered guard ───────────────────────────────────────────────────
// markdownToHTML.ts already KaTeX render કરે છે —
// ChatWidget.tsx ફરી call ન કરે તે માટે guard
export function isAlreadyKatexRendered(text: string): boolean {
  return (
    text.includes('class="katex"') ||
    text.includes("katex-html") ||
    text.includes("katex-mathml")
  );
}

function tryRenderLine(trimmed: string): string | null {
  const r1 = tryKatex(trimmed, false);
  if (r1) return r1;

  const withDiff = trimmed.replace(
    /\s+d([a-zA-Z])$/,
    (_m, v) => "\\,d" + v
  );
  if (withDiff !== trimmed) {
    const r2 = tryKatex(withDiff, false);
    if (r2) return r2;
  }

  const withText = trimmed.replace(
    /\s+([a-zA-Z]+)$/,
    (_m, w) => "\\,\\text{" + w + "}"
  );
  if (withText !== trimmed) {
    const r3 = tryKatex(withText, false);
    if (r3) return r3;
  }

  const withoutTrailing = trimmed.replace(/\s+[a-zA-Z]+$/, "").trim();
  if (withoutTrailing !== trimmed && LATEX_COMMAND_RE.test(withoutTrailing)) {
    const r4 = tryKatex(withoutTrailing, false);
    if (r4) return r4;
  }

  return null;
}

/**
 * renderMathInHtml
 *
 * Renders KaTeX math inside HTML string.
 * Supports: $$...$$, $...$, \begin{env}...\end{env}, bare LaTeX commands
 *
 * Called by:
 *   • markdownToHTML.ts  → incoming AI messages (after markdown parse)
 *   • ChatWidget.tsx     → outgoing user messages only
 *
 * Guard: already-rendered KaTeX HTML → skip (double render prevention)
 */
export function renderMathInHtml(text: string): string {
  if (!text) return text;

  // Guard: already KaTeX rendered → return as-is
  if (isAlreadyKatexRendered(text)) return text;

  let result = text;
  const hasHtmlTags = /<[a-zA-Z][^>]*>/.test(result);
  const hasDollarDelimiters = /\$/.test(result);

  // ── STEP 0: Pure bare LaTeX (no HTML, no $) ────────────────────────────────
  if (!hasHtmlTags && !hasDollarDelimiters && LATEX_COMMAND_RE.test(result)) {
    // \begin{env}...\end{env} environments
    const envReplaced = result.replace(
      /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g,
      (_match, env, body) => {
        const expr = `\\begin{${env}}${body}\\end{${env}}`;
        const rendered = tryKatex(expr, true);
        return rendered
          ? '<span class="math-block">' + rendered + "</span>"
          : _match;
      }
    );
    if (envReplaced !== result) {
      let out = envReplaced.replace(/\r?\n/g, "<br>");
      out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
      return out;
    }

    // Line-by-line
    const lines = result.split("\n");
    const rendered = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || !LATEX_COMMAND_RE.test(line)) return line;
      return tryRenderLine(trimmed) ?? line;
    });
    let out = rendered.join("\n");
    out = out.replace(/\r?\n/g, "<br>");
    out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
    return out;
  }

  // ── STEP 1: Newlines → <br> ────────────────────────────────────────────────
  result = result.replace(/\r?\n/g, "<br>");
  result = result.replace(/(<br>\s*){3,}/gi, "<br><br>");

  // ── STEP 2: $$ ... $$ block math ──────────────────────────────────────────
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, "\n").trim();
    const rendered = tryKatex(clean, true);
    return rendered
      ? '<span class="math-block">' + rendered + "</span>"
      : simpleFallback(clean);
  });

  // ── STEP 2b: \begin{env}...\end{env} without $$ ───────────────────────────
  result = result.replace(
    /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g,
    (_match, env, body) => {
      const clean = body.replace(/<br>/gi, "\n");
      const expr = `\\begin{${env}}${clean}\\end{${env}}`;
      const rendered = tryKatex(expr, true);
      return rendered
        ? '<span class="math-block">' + rendered + "</span>"
        : _match;
    }
  );

  // ── STEP 3: $ ... $ inline math ───────────────────────────────────────────
  result = result.replace(/\$([^$\n<]{1,500}?)\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, " ").trim();
    const rendered = tryKatex(clean, false);
    return rendered ? rendered : simpleFallback(clean);
  });

  // ── STEP 4: ^ _ superscript/subscript fallback ────────────────────────────
  result = result.replace(
    /(<[^>]+>)|([^<]+)/g,
    (_match, tag, t) => {
      if (tag) return tag;
      if (!t) return t ?? "";
      if (/[\\]/.test(t)) return t;
      if (/[\^_]/.test(t)) return simpleFallback(t);
      return t;
    }
  );

  return result;
}