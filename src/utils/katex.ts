import katex from "katex";

function tryKatex(expr: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      output: "html", // ← katex-mathml generate નહીં થાય — side text gone
    });
  } catch {
    return null;
  }
}

function simpleFallback(t: string): string {
  t = t.replace(
    /(\([^)]*\)|[a-zA-Z0-9])\^\{([^}]{1,40})\}/g,
    (_, b, e) => b + "<sup>" + e + "</sup>",
  );
  t = t.replace(
    /(\([^)]*\)|[a-zA-Z0-9])\^(\d+|[a-zA-Z])/g,
    (_, b, e) => b + "<sup>" + e + "</sup>",
  );
  t = t.replace(
    /([a-zA-Z0-9])_\{([^}]{1,40})\}/g,
    (_, b, s) => b + "<sub>" + s + "</sub>",
  );
  t = t.replace(
    /([a-zA-Z0-9])_([a-zA-Z0-9])/g,
    (_, b, s) => b + "<sub>" + s + "</sub>",
  );
  return t;
}

const LATEX_COMMAND_RE =
  /\\(?:begin|end|sum|frac|int|iint|iiint|oint|prod|coprod|lim|sup|inf|sqrt|left|right|binom|infty|alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|Upsilon|phi|Phi|chi|psi|Psi|omega|Omega|partial|nabla|cdot|cdots|ddots|vdots|ldots|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|simeq|cong|propto|forall|exists|nexists|in|notin|subset|subseteq|supset|supseteq|cup|cap|setminus|emptyset|mathbb|mathbf|mathit|mathcal|mathsf|mathtt|mathrm|text|operatorname|overline|underline|overbrace|underbrace|hat|vec|dot|ddot|tilde|bar|widehat|widetilde|overrightarrow|overleftarrow|stackrel|xrightarrow|xleftarrow|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|to|gets|uparrow|downarrow|Uparrow|Downarrow|vert|Vert|lfloor|rfloor|lceil|rceil|langle|rangle|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|cases|aligned|align|gather|array|split|underset|overset|limits|displaystyle|textstyle|color|boxed|cancel|not|land|lor|neg|oplus|otimes|circ|bullet|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|det|dim|ker|deg|gcd|max|min|mod|bmod|pmod)\b/;

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

  const withDiff = trimmed.replace(/\s+d([a-zA-Z])$/, (_m, v) => "\\,d" + v);
  if (withDiff !== trimmed) {
    const r2 = tryKatex(withDiff, false);
    if (r2) return r2;
  }

  const withText = trimmed.replace(
    /\s+([a-zA-Z]+)$/,
    (_m, w) => "\\,\\text{" + w + "}",
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

export function renderMathInHtml(text: string): string {
  if (!text) return text;

  if (isAlreadyKatexRendered(text)) return text;

  let result = text;
  const hasHtmlTags = /<[a-zA-Z][^>]*>/.test(result);
  const hasDollarDelimiters = /\$/.test(result);

  // ── STEP 0: Pure bare LaTeX (no HTML, no $) ───────────────────────────────
  if (!hasHtmlTags && !hasDollarDelimiters && LATEX_COMMAND_RE.test(result)) {
    const envReplaced = result.replace(
      /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g,
      (_match, env, body) => {
        const expr = `\\begin{${env}}${body}\\end{${env}}`;
        const rendered = tryKatex(expr, true);
        return rendered
          ? '<span class="math-block">' + rendered + "</span>"
          : _match;
      },
    );
    if (envReplaced !== result) {
      let out = envReplaced.replace(/\r?\n/g, "<br>");
      out = out.replace(/(<br>\s*){3,}/gi, "<br><br>");
      return out;
    }

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

  // ── STEP 1: Newlines → <br> ───────────────────────────────────────────────
  result = result.replace(/\r?\n/g, "<br>");
  result = result.replace(/(<br>\s*){3,}/gi, "<br><br>");

  // ── STEP 2: $$ ... $$ block math ─────────────────────────────────────────
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, "\n").trim();
    const rendered = tryKatex(clean, true);
    return rendered
      ? '<span class="math-block">' + rendered + "</span>"
      : simpleFallback(clean);
  });

  // ── STEP 2b: \begin{env}...\end{env} ─────────────────────────────────────
  result = result.replace(
    /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g,
    (_match, env, body) => {
      const clean = body.replace(/<br>/gi, "\n");
      const expr = `\\begin{${env}}${clean}\\end{${env}}`;
      const rendered = tryKatex(expr, true);
      return rendered
        ? '<span class="math-block">' + rendered + "</span>"
        : _match;
    },
  );

  // ── STEP 3: $ ... $ inline math ──────────────────────────────────────────
  result = result.replace(/\$([^$\n<]{1,500}?)\$/g, (_, expr) => {
    const clean = expr.replace(/<br>/gi, " ").trim();
    const rendered = tryKatex(clean, false);
    return rendered ? rendered : simpleFallback(clean);
  });

  // ── STEP 4: ^ _ fallback ─────────────────────────────────────────────────
  result = result.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, t) => {
    if (tag) return tag;
    if (!t) return t ?? "";
    if (/[\\]/.test(t)) return t;
    if (/[\^_]/.test(t)) return simpleFallback(t);
    return t;
  });

  return result;
}
