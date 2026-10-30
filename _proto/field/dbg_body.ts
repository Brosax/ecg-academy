// dbg_body.ts — dump body-frame node positions for a geometry override (dev). usage: GEOM='{...}' node dbg_body.ts out.json
import { buildGeom, DEFAULT_GEOM } from './geom.ts';
import { defaultTorso } from './torso.ts';
import { writeFileSync } from 'node:fs';
const g = buildGeom({ ...DEFAULT_GEOM, ...(process.env.GEOM ? JSON.parse(process.env.GEOM) : {}) });
const tp = defaultTorso();
writeFileSync(process.argv[2], JSON.stringify({ n: g.n, pos: Array.from(g.pos, (v) => Math.round(v)), ch: Array.from(g.ch), sf: Array.from(g.sf), A: tp.A, B: tp.B, elec: tp.elec }));
