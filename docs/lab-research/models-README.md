# Third-party heart models — provenance, licences, attribution

The realistic heart used by the app (geometry source `hra`) is adapted from two Human Reference Atlas (HRA, HuBMAP)
3D reference organs. Both are licensed **CC BY 4.0** (<https://creativecommons.org/licenses/by/4.0/>). The user approved
them before download (plan `3d-p-12-cheeky-crane.md`, "变更记录（2026-10-08）").

| File (in `raw/`, not committed) | Model | Version | DOI | Licence |
|---|---|---|---|---|
| `3d-vh-m-heart.glb` | HRA 3D Reference Organ "Heart, Male" (`VH_M_Heart`), Visible Human male. Creators: Browne K, Schlehlein H (2024) | v1.3 | <https://doi.org/10.48539/HBM564.WKNG.249> | CC BY 4.0 |
| `3d-vh-m-blood-vasculature.glb` | HRA 3D Reference Organ "Blood Vasculature, Male" (`VH_M_Blood_Vasculature`), Visible Human male. Creators: as listed at the DOI | v1.3 | <https://doi.org/10.48539/HBM473.XTPP.725> | CC BY 4.0 |
| `3d-vh-f-heart.glb` | "Heart, Female" (`VH_F_Heart`) — downloaded, **not used** | v1.3 | — | CC BY 4.0 |

`raw/` is gitignored. Only the baked derivative `src/assets/heart-hra.bin` is committed and shipped.

## Attribution shown to users

The About dialog lists both models (title, creators, DOI, licence and the changes made) from
`src/sim/geometry/hra/parts.ts` (`HRA_CREDITS`, also carried in `GeometryBundle.credits`) via
`src/app/ui/references.ts` (`MODEL_CREDITS`).

## Changes made (CC BY "indicate if changes were made")

`src/assets/heart-hra.bin` is a derived work of both models:

- welded duplicate vertices, dropped degenerate faces, capped open boundaries for voxelization (render meshes keep the
  original triangles);
- re-oriented from the Visible Human body frame (metres; +x patient left, +y superior, +z anterior) into a heart-local
  frame derived from the data (origin = ventricular centroid; +y LV apex → mitral annulus; +x away from the RV), mm;
- voxelized at 1.5 mm into tissue labels (LV / RV / septum / LA / RA myocardium, blood pools, valve annuli as fibrous
  ring, vessels), with walls thickened to ≥ 2 voxels and a fibrous ring inserted wherever atrial and ventricular
  myocardium touched; derived fields (AHA segments, regions, wall depth, apex→base, transmural direction, signed
  distance) and a moderator band were added;
- only the annulus bands of the valve meshes are kept (the app animates its own leaflets);
- cardiac vessels kept: ascending aorta, arch and descending aorta (trimmed near the heart), arch-branch stubs, pulmonary
  trunk and arteries, superior and inferior vena cava (trimmed), four pulmonary veins, coronary arteries (left main,
  LAD, two diagonals, left marginal, RCA, right marginal, PDA) and cardiac veins (great, middle, small, anterior,
  posterior LV vein, oblique vein of the LA, coronary sinus). Known source quirk: the LAD node's FMA id is wrong in the
  source metadata; the node name is correct;
- a conduction system (SA node, Bachmann's bundle, AV node, His bundle, bundle branches, fascicles) was placed on the
  anatomy by this project — it is not part of the HRA models.

## Rebuilding the asset

1. Put the three GLBs above in `assets/models/raw/` (download from the DOIs / the HRA 3D reference object library).
2. `BAKE=1 node node_modules/vitest/vitest.mjs run tests/bake` — writes `src/assets/heart-hra.bin`,
   `tests/out/hra/bake-report.json` and visual checks `tests/out/hra/hra-*.png`.
3. `node node_modules/vitest/vitest.mjs run tests/sim/geometry/hra` checks the committed asset.

## Known properties of the source heart

The Visible Human male heart is a fixed cadaveric heart: the LV cavity is small (≈ 47 mL after voxelization, close to
end-systole), the long axis points strongly anterior (apex direction in the body frame ≈ left 0.47, inferior 0.40,
anterior 0.79) and the right atrium mesh is thin and broken in places (it is sealed during voxelization).

## Body surface (electrodes view)

- **HRA 3D Reference Organ — Skin, Male v1.3** (`3d-vh-m-skin.glb`, 5,931,856 bytes), Browne K, Schlehlein H, Human
  Reference Atlas / HuBMAP; Visible Human Male data (NLM). https://doi.org/10.48539/HBM527.FMBB.748 — **CC BY 4.0**.
  Same Visible Human Male body frame as the heart (identity transform in the HRA male scene), so no registration is needed.
- Changes made here: moved into the heart's app frame (origin = ventricular centroid), quantized and compressed into
  `src/assets/body-hra.bin`, drawn translucent; electrode sites and precordial landmark lines (sternal midline,
  midclavicular, anterior and mid-axillary lines, 4th/5th intercostal levels) were added by this project. They are
  **estimated** from body proportions and the cardiac apex — the HRA has no male ribs. In the cadaver the arms rest
  against the chest, so the mid-axillary line is taken from the first level below V4 where the arm separates.
- Rebuild: `BAKE=1 node node_modules/vitest/vitest.mjs run tests/bake/body.test.ts` (needs the heart, vessel and skin
  GLBs in `assets/models/raw/`); report in `tests/out/hra/body-report.json`.
