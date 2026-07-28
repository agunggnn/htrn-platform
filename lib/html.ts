export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

if (process.env.NODE_ENV === 'test') {
  console.assert(escapeHtml(`<script>'"&`) === '&lt;script&gt;&#39;&quot;&amp;')
}
