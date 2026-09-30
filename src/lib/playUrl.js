/** A kiosk QR must encode a web URL, with the game as its destination. */
export function resolvePlayUrl(configuredUrl, origin) {
  const fallback = new URL('/play', origin).href;
  const value = configuredUrl?.trim();
  if (!value) return fallback;
  try {
    // Support a pasted domain as well as a complete URL or a relative path.
    const input = /^(https?:\/\/|\/)/i.test(value) ? value : `https://${value}`;
    const url = new URL(input, origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        (!url.hostname.includes('.') && url.hostname !== 'localhost' && url.hostname !== '[::1]')) return fallback;
    url.pathname = '/play';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return fallback;
  }
}

export function isLoopbackUrl(value) {
  const host = new URL(value).hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || /^127\./.test(host);
}
