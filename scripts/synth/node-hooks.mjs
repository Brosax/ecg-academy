/**
 * Dev-only Node resolve hook for the synth scripts: Node 24 strips TypeScript types but does not resolve the
 * extensionless relative imports that src/ uses (Vite/bundler resolution). This hook tries `<spec>.ts` and
 * `<spec>/index.ts` for relative specifiers without an extension. Usage:
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/gallery.ts
 */
import { registerHooks } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HAS_EXT = /\.(?:[cm]?[jt]sx?|json)$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !HAS_EXT.test(specifier) && context.parentURL?.startsWith('file:')) {
      for (const ext of ['.ts', '/index.ts', '.tsx']) {
        try {
          const p = fileURLToPath(new URL(specifier + ext, context.parentURL));
          if (existsSync(p) && statSync(p).isFile()) return nextResolve(specifier + ext, context);
        } catch {
          /* try the next candidate */
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
