// Renders constants/privacy-policy.json → docs/privacy.html for hosting at
// https://lrakoto.github.io/eventi/privacy/ (the App Store Connect privacy URL).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../constants/privacy-policy.json', import.meta.url)));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sections = policy.sections
  .map((s) => `    <h2>${esc(s.heading)}</h2>\n    <p>${esc(s.body)}</p>`)
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Eventi Privacy Policy</title>
  <style>
    :root { color-scheme: light dark; --fg: #111; --muted: #555; --bg: #fff; --accent: #F0386B; }
    @media (prefers-color-scheme: dark) { :root { --fg: #f2f2f2; --muted: #aaa; --bg: #111; } }
    body { margin: 0; background: var(--bg); color: var(--fg);
           font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 680px; margin: 0 auto; padding: 48px 16px 80px; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    h2 { font-size: 18px; margin: 32px 0 6px; }
    p { margin: 0; color: var(--muted); }
    a { color: var(--accent); }
    .updated { margin-top: 40px; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <h1>Eventi Privacy Policy</h1>
${sections}
    <h2>Contact</h2>
    <p>Questions or requests: <a href="mailto:${esc(policy.contactEmail)}">${esc(policy.contactEmail)}</a></p>
    <p class="updated">Last updated ${esc(policy.lastUpdated)}</p>
  </main>
</body>
</html>
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/privacy.html', import.meta.url), html);
console.log('Wrote docs/privacy.html');
