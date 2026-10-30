/**
 * Boot guard for malformed addresses. The router (src/app/router.ts, frozen) decodes every path segment with
 * decodeURIComponent, which throws on a broken escape — e.g. a truncated share link such as `#/practice/rate%3`. The
 * router reads the hash when its module is evaluated, so such a link would leave a blank page.
 *
 * This module must be the FIRST import of src/main.tsx (ES modules evaluate in import order, so it runs before anything
 * that imports the router) and must not import the router itself. It rewrites a broken hash in place (history.replaceState,
 * no new history entry) and keeps doing so on hashchange: its listener is registered before startRouter() adds the
 * router's, so the router always reads a decodable hash. Remove it once parseHash handles URIError itself.
 */

/**
 * The decoded segment, or null when it cannot be decoded. The decoded value must be returned and used: minifiers treat
 * decodeURIComponent as pure and drop a call whose result is discarded (which would make every segment "decode").
 */
function decoded(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

const decodes = (segment: string): boolean => decoded(segment) !== null;

/**
 * The hash with every undecodable path segment made literal ('%' → '%25'), or null when the hash is already fine.
 * Decodable segments and anything after '?' are kept as they are.
 */
export function repairHash(hash: string): string | null {
  const body = hash.replace(/^#\/?/, '');
  const q = body.indexOf('?');
  const path = q < 0 ? body : body.slice(0, q);
  const query = q < 0 ? '' : body.slice(q);
  const segments = path.split('/');
  if (segments.every(decodes)) return null;
  const fixed = segments.map((s) => (decodes(s) ? s : s.replace(/%/g, '%25'))).join('/');
  return `#/${fixed}${query}`;
}

function repairLocation(): void {
  const loc = globalThis.location;
  if (!loc) return;
  const fixed = repairHash(loc.hash);
  if (fixed != null) globalThis.history?.replaceState(globalThis.history.state, '', fixed);
}

repairLocation();
globalThis.addEventListener?.('hashchange', repairLocation);
