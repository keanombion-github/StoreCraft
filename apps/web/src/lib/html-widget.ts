export function validateHtmlWidget(html: string, height = 240): string | null {
  if (
    typeof html !== "string" ||
    html.length > 20000 ||
    !Number.isInteger(height) ||
    height < 60 ||
    height > 1200
  )
    return "HTML widgets allow up to 20,000 characters and a height of 60–1200 pixels.";
  if (
    /<\s*\/?\s*(script|iframe|object|embed|form|input|button|textarea|select|meta|base|link)\b|\bon[a-z]+\s*=|javascript\s*:|\bsrcdoc\s*=|<!|<\?/i.test(
      html,
    )
  )
    return "Use presentation HTML and inline CSS. Scripts, embedded pages and forms are blocked.";
  return null;
}
export function htmlWidgetDocument(
  html: string,
  accent: string,
  light: boolean,
) {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;padding:20px;font:16px/1.6 Inter,Arial,sans-serif;color:${light ? "#302832" : "#f2ebfa"};overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:${accent}}</style></head><body>${html}</body></html>`;
}
