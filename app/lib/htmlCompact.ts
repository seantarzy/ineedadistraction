// Compact an HTML game document so it consumes fewer tokens when sent to Sonnet.
// Functionally identical to the input — just whitespace/comment trimming.
// We rely on Sonnet to mirror the compact style in its output, which keeps both
// max_tokens and Vercel's 60s function timeout out of the danger zone.

export function compactHtml(html: string): string {
  let s = html;

  // Strip HTML comments (<!-- ... --> but preserve conditional comments like <!--[if IE]>)
  s = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  // Strip JS line comments inside <script>…</script> — only ones starting at line beginning
  // or after whitespace, not inside strings/regexes (regex-based is best-effort but safe enough
  // for typical game code; we never break strings since we anchor on whitespace).
  s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body) => {
    let b = body as string;
    // Remove /* ... */ block comments
    b = b.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove // line comments — must be preceded by whitespace, line start, or `;` to avoid URLs
    b = b.replace(/(^|[\s;{}()])\/\/[^\n]*/g, '$1');
    // Collapse runs of whitespace to single space
    b = b.replace(/[\t ]+/g, ' ');
    // Drop empty lines
    b = b.replace(/\n\s*\n+/g, '\n');
    return m.replace(body, b);
  });

  // Strip CSS comments inside <style>...</style>
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, body) => {
    let b = body as string;
    b = b.replace(/\/\*[\s\S]*?\*\//g, '');
    b = b.replace(/[\t ]+/g, ' ');
    b = b.replace(/\n\s*\n+/g, '\n');
    return m.replace(body, b);
  });

  // Collapse runs of whitespace between HTML tags (but preserve content within tags)
  s = s.replace(/>\s+</g, '><');

  // Collapse multiple blank lines anywhere
  s = s.replace(/\n\s*\n+/g, '\n');

  return s.trim();
}
