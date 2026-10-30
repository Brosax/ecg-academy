/**
 * Lazy loading of the baked heart (src/assets/heart.bin): imported with Vite '?url' (a data: URL in the single-file
 * build, a file URL in dev), read and decoded once on first use; every Heart3D instance shares the decoded asset.
 */
import heartUrl from '../assets/heart.bin?url';
import { decodeHeart, type HeartAsset } from './format';

let pending: Promise<HeartAsset> | null = null;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const m = /^data:[^,]*;base64,/.exec(url);
  if (m) return base64ToBytes(url.slice(m[0].length));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`heart.bin: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** The decoded heart, loaded once (a failed load can be retried by calling again). */
export function loadHeartAsset(): Promise<HeartAsset> {
  if (!pending) {
    pending = fetchBytes(heartUrl).then(decodeHeart);
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}
