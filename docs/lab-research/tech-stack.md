# Research: tech-stack

> Generated 2026-10-08 by read-only research agents. Numbers carry citations; items under "Unsourced" are general knowledge or design choices and must be treated as tunable.

## Summary

Stack versions checked against the npm registry on 2026-10-07/08: three 0.186.1 (r186, published 2026-09-24), @types/three 0.186.0, vite 8.3.3 (published 2026-10-06; Rolldown + Oxc; Node ^20.19 || >=22.12), typescript 7.0.2 (the native Go compiler, published 2026-07-08; it ships no programmatic API and defaults to strict, module esnext and types []), vitest 5.0.3 (needs Node >=22.12 and Vite >=6.4; peer vite ^6.4||^7||^8). This machine runs Node 24.15, which meets every requirement.
Renderer choice: use WebGLRenderer, not WebGPURenderer. Five reasons: (1) stencil capping in WebGL is a mature official example (webgl_clipping_stencil); (2) the WebGPU version (webgpu_clipping_stencil) only arrived in r186 via PR #34325, whose author says it 'was not functional without multiple bug fixes'; (3) Material.onBeforeCompile and customProgramCacheKey work only with WebGLRenderer; (4) on r183 a user measured WebGPURenderer at about 2x the CPU time per frame and 5-10x the first-frame time; (5) Firefox WebGPU support is still partial (no Linux, no Intel Mac).
Gotcha: WebGLRenderer has had stencil=false by default since r163. Pass { antialias:true, stencil:true } to the constructor; setting it later does nothing. RenderTarget also defaults to stencilBuffer:false, and EffectComposer's default target sets only type: HalfFloatType. So with bloom, give the composer a render target with stencilBuffer:true, or the caps break.
Cross-section: either the WebGL example method (IncrementWrap on back faces, DecrementWrap on front faces, cap with NotEqual/Replace, clearStencil after each cap, renderOrder i+1 for stencil, i+1.1 for cap, 6 for the visible mesh) or the r186 parity method (one DoubleSide mesh with InvertStencilOp and stencilWriteMask = 1<<i; cap uses stencilFuncMask = bit, so no clearStencil is needed). Both need a closed, watertight mesh and fail with transparent materials.
Key design consequence: the cap is a separate plane mesh, so it cannot read the heart's per-vertex region or activation attributes. To colour the cut face by activation, the cap's fragment shader must work out region and activation from world position, for example from a baked Data3DTexture or the analytic SDF.
Heart mesh: build it as one SDF. Blend the outer chamber ellipsoids with Inigo Quilez's quadratic smin (k*=4; h=max(k-|a-b|,0)/k; min(a,b)-h*h*k/4) and subtract the cavities with max(d,-cavity). sdEllipsoid is only a lower bound, which is fine for meshing. Iquilezles.org says its code snippets are MIT-licensed.
Mesh with your own indexed surface nets or isosurface (MIT). Avoid the three MarchingCubes addon: it is built for metaballs, maxPolyCount defaults to 10000, isolation to 80, the grid spans [-1,1], and it outputs unindexed triangles. Use manifold-3d levelSet (Apache-2.0) if you need a guaranteed manifold; note its SDF is positive inside, so negate yours.
My own Node 24 benchmark (unsourced; synthetic 10-ellipsoid heart): grid evaluation 106 ms at 64^3, 306 ms at 96^3, 692 ms at 128^3. Surface nets gives about 11k, 26k and 47k vertices at those sizes, so 96-128^3 lands in the 20-60k target. Generate it in a Web Worker or bake it at build time.
Per-vertex animation: put static attributes on the mesh (region id, activation time, repolarization time, contraction direction) and drive colour and contraction in the vertex shader from a uTime uniform plus a small array of per-region uniforms. Do this with onBeforeCompile on MeshStandardMaterial. This avoids re-uploading about 0.7-2 MB of attributes per frame with needsUpdate, which sends the whole buffer via bufferSubData unless update ranges are set. Mirror the same displacement in the stencil materials. Vertex colours must be Linear-sRGB.
Conduction pulses: TubeGeometry (uv.x runs along the path, i/tubularSegments) with a shader pulse window, plus UnrealBloomPass with a selective-bloom layer and OutputPass as the last pass. The material swapped in for the darkened (non-bloom) pass must copy clippingPlanes and side. For the heart vector, ArrowHelper needs a normalized direction and its line is always 1 px, so a cylinder+cone mesh is better for a thick arrow.
ECG canvas: 25 mm/s and 10 mm/mV; small box 1 mm = 0.04 s x 0.1 mV, large box 5 mm = 0.2 s x 0.5 mV. Standard sheet is 4 columns x 3 rows of 2.5 s each, plus a 10 s rhythm strip. Use layered canvases (static grid prerendered, trace on top). For high DPI, use ResizeObserver with device-pixel-content-box (Chrome 84+, Firefox 108+, not in Safari), falling back to devicePixelRatio scaling.
Prior art with code you can reuse under its license: CardioSim 3D (MIT; dipole lead vector kappa*(r_i-r_0)/|r_i-r_0|^3), ecg-atlas (MIT code; assets CC BY 4.0 / ODC-By) and OSET (BSD-3; Sameni's VCG Gaussian parameters and lead matrix H). Study only: heart-ekg-simulator (Gelato1337) and ecg-heart-simulator (ashukuri) have no licence; ECGSYN is GPL-3; ECGSIM is a free download but not open source. 3D heart models: BodyParts3D is now CC BY 4.0 (last updated 2025-02-27), Z-Anatomy is CC BY-SA 4.0, NIH 3D licences vary per entry.

## 1a. Latest stable versions (npm registry, queried 2026-10-07/08)  _(confidence: high)_

three: latest 0.186.1, published 2026-09-24T14:42Z. Earlier: 0.186.0 on 2026-09-08, 0.185.1 on 2026-07-01, 0.185.0 on 2026-06-25, 0.184.0 on 2026-04-16. @types/three: 0.186.0 (modified 2026-10-04). vite: latest 8.3.3 (2026-10-06); other tags beta 8.3.0-beta.1, previous 6.4.4. Vite engines: node ^20.19.0 || >=22.12.0; esbuild is now an optional peer (^0.27 || ^0.28). typescript: latest 7.0.2 (2026-07-08); next 7.1.0-dev.20261007.1; 6.0.3 was the last JS-based release (2026-04-16). The TS 7 package ships per-platform native binaries (@typescript/typescript-win32-x64 etc.) and still installs a 'tsc' bin; engines node >=16.20. vitest: latest 5.0.3 (2026-09-30); 5.0.0 was 2026-09-03. Vitest engines: node ^22.12.0 || ^24.0.0 || >=26.0.0; peer vite ^6.4.0 || ^7.0.0 || ^8.0.0. three 0.186.1 exports map: '.' maps to ./build/three.module.js (import) or three.cjs (require); './addons' maps to ./examples/jsm/Addons.js; './addons/*' maps to ./examples/jsm/*; './webgpu' maps to ./build/three.webgpu.js; './tsl' maps to ./build/three.tsl.js. Unpacked size is about 20.4 MB.

Sources:
- https://registry.npmjs.org/three/latest
- https://registry.npmjs.org/vite/latest
- https://registry.npmjs.org/typescript/latest
- https://registry.npmjs.org/vitest/latest
- npm view three time / dist-tags / exports (run 2026-10-07)

## 1b. three.js migration notes relevant to this app (official Migration Guide wiki)  _(confidence: high)_

r147->r148: examples/js removed; addons are ES modules only (examples/jsm, imported as 'three/addons/...'). r152: ColorManagement.enabled defaults to true; WebGLRenderer.outputColorSpace defaults to SRGBColorSpace. r153->r154: shader chunk encodings_fragment renamed to colorspace_fragment. r158: BufferAttribute.updateRange replaced by updateRanges / addUpdateRange(). r160->r161: build/three.js and three.min.js removed (ES modules only). r162->r163: 'The stencil context attribute of WebGLRenderer is now false by default for performance reasons' and 'WebGLRenderer no longer supports WebGL 1.' r170: WebGPU imports are 'three/webgpu' and 'three/tsl'. r180->r181: WebGPURenderer renderAsync()/computeAsync() deprecated; call await renderer.init() first. r181->r182: PCFSoftShadowMap deprecated with WebGLRenderer (PCFShadowMap is now soft). r182->r183: PostProcessing renamed to RenderPipeline; Clock deprecated in favour of Timer. r184->r185: WebGPURenderer premultiplied-alpha change; AnamorphicNode removed; Matrix3 .scale/.rotate/.translate deprecated. r185->r186: Object3D has dispose(), so subclasses must call super.dispose(); Source renamed to TextureSource; SimplifyModifier.modify() is now async. Upcoming r187 (dev): PMREM based on cube render targets; CubeUVReflectionMapping removed. r186 release notes also list 'Honor clipping in compile()' (WebGLRenderer), 'Add clipping + stencil demo' (#34325), UnrealBloomPass 'Merge adjacent taps into bilinear fetches', and 'Don't use MSAA for fullscreen-passes'.

Sources:
- https://github.com/mrdoob/three.js/wiki/Migration-Guide
- https://github.com/mrdoob/three.js/releases/tag/r186
- https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791

## 1c. Vite 8 / TypeScript 7 / Vitest 5 changes  _(confidence: high)_

Vite 8 was released 2026-03-12. Rolldown is the single bundler and Oxc does parsing, TS transform and minification. build.target default 'baseline-widely-available' = ['chrome111','edge111','firefox114','safari16.4','ios16.4'] (Vite 7 was chrome107/edge107/firefox104/safari16.0). build.minify default 'oxc' (docs: '30 ~ 90x faster than terser and only 0.5 ~ 2% worse compression'). CSS minify uses Lightning CSS. build.rollupOptions is renamed build.rolldownOptions (old name is a deprecated alias); worker.rollupOptions becomes worker.rolldownOptions. The esbuild option auto-converts to oxc. CommonJS default-import interop is now consistent between dev and build. Passing a URL to import.meta.hot.accept was removed. Install is about 15 MB heavier (native binaries). TypeScript 7.0 was released 2026-07-08 and is a Go port with 8-12x faster full builds (vscode: 125.7 s to 10.6 s). New defaults: strict on, module esnext, target = latest stable ES, types defaults to [] (so list 'vite/client' explicitly), rootDir defaults to './'. These are now hard errors: target es5, downlevelIteration, baseUrl, moduleResolution node/node10/classic, module amd/umd/systemjs/none, and esModuleInterop:false. 'TypeScript 7.0 does not ship with an API'; a new API is expected in 7.1. To coexist with 6.0: npm install -D typescript@npm:@typescript/typescript6 (provides tsc6). Vitest 5.0 was released 2026-09-03 and needs Node >=22.12 and Vite >=6.4. Changes: clearMocks defaults to true; un-awaited async assertions now fail; locators are strict; reporter output goes under .vitest/; loupe replaced by pretty-format; 8-25% faster.

Sources:
- https://vite.dev/blog/announcing-vite8
- https://vite.dev/guide/migration
- https://vite.dev/config/build-options
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://vitest.dev/blog/vitest-5
- https://blog.openreplay.com/vitest-5-changes/

## 1d. WebGLRenderer vs WebGPURenderer for this app  _(confidence: high)_

WebGLRenderer constructor defaults: alpha false, antialias false, stencil false, depth true, precision 'highp', powerPreference 'default', logarithmicDepthBuffer false, reversedDepthBuffer false. localClippingEnabled defaults to false. autoClearStencil true. outputColorSpace SRGBColorSpace. toneMapping NoToneMapping. clearStencil() is equivalent to clear(false,false,true). Docs say to use setAnimationLoop instead of requestAnimationFrame. WebGPURenderer defaults: alpha true, stencil false, antialias false (when enabled, samples=4), outputBufferType HalfFloatType, forceWebGL false; it falls back to a WebGL 2 backend. Clipping in WebGPU uses ClippingGroup ('In earlier three.js versions, clipping was defined globally on the renderer or on material level'); props clippingPlanes, clipIntersection=false, clipShadows=false, enabled=true. Material.onBeforeCompile and customProgramCacheKey 'can only be used when rendering with WebGLRenderer'; for WebGPU the recommended path is Node materials and TSL. Performance on r183, 4,000 meshes / about 8M triangles (forum, 2026-05-29): WebGL 4.5 ms CPU, 32 ms first frame, about 225 fps; WebGPURenderer (WebGPU backend) 9.7 ms, 167 ms, about 103 fps; WebGPURenderer with forceWebGL 10.3 ms, 344 ms, about 97 fps. Maintainer manthrax: 'WebGPURenderer is only a couple years old, and still has lots of bugs/edge cases'. A WebGPU clipping bug report (2026-02-06) was still unresolved in the thread. WebGPU browser support (MDN BCD): Chrome 113+ partial, 144+ full; Firefox 141+ partial (Windows; macOS Apple silicon from 145/147; no Intel Mac; no Linux); Safari 26.

Sources:
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/docs/pages/WebGPURenderer.html
- https://threejs.org/docs/pages/ClippingGroup.html
- https://threejs.org/docs/pages/Material.html
- https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904
- https://discourse.threejs.org/t/clipping-plane-in-webgpu-bug-help/89669
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/GPU.json

## 2a. Stencil-capped cross-section, official WebGL example (webgl_clipping_stencil)  _(confidence: high)_

Renderer: new THREE.WebGLRenderer({ antialias: true, stencil: true }); renderer.localClippingEnabled = true. Planes: Plane((-1,0,0),0), Plane((0,-1,0),0), Plane((0,0,-1),0). For each plane i, createPlaneStencilGroup(geometry, plane, renderOrder=i+1) builds a base MeshBasicMaterial with depthWrite=false, depthTest=false, colorWrite=false, stencilWrite=true, stencilFunc=AlwaysStencilFunc. Mesh 0: side=BackSide, clippingPlanes=[plane], stencilFail/ZFail/ZPass = IncrementWrapStencilOp. Mesh 1: side=FrontSide, same plane, ops = DecrementWrapStencilOp. Cap: PlaneGeometry(4,4) with MeshStandardMaterial { clippingPlanes: planes.filter(p => p !== plane), stencilWrite: true, stencilRef: 0, stencilFunc: NotEqualStencilFunc, stencilFail/ZFail/ZPass: ReplaceStencilOp }; po.onAfterRender = renderer => renderer.clearStencil(); po.renderOrder = i + 1.1. Visible clipped mesh: MeshStandardMaterial { clippingPlanes: planes, clipShadows: true, shadowSide: DoubleSide }, renderOrder = 6. Each frame: plane.coplanarPoint(po.position); po.lookAt(po.position.x - plane.normal.x, po.position.y - plane.normal.y, po.position.z - plane.normal.z). Clipping-plane convention: points with negative signed distance to the plane are clipped.

Sources:
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_clipping_stencil.html
- https://threejs.org/docs/pages/Material.html

## 2b. Parity stencil variant (webgpu_clipping_stencil, r186) and gotchas  _(confidence: high)_

The r186 WebGPU example (PR #34325) uses one DoubleSide MeshBasicNodeMaterial per plane: depthWrite/depthTest/colorWrite false, stencilWrite true, stencilWriteMask = stencilBit (1<<i), stencilFunc Always, all three stencil ops = InvertStencilOp, wrapped in a ClippingGroup. Its cap uses stencilRef 0, stencilFuncMask = stencilWriteMask = stencilBit, NotEqualStencilFunc, ReplaceStencilOp. Each plane has its own bit, so no clearStencil is needed. The same material settings exist on WebGL materials, so the method can be ported. Renderer: new WebGPURenderer({ antialias: true, stencil: true }); renderOrder i+1 / i+1.1 / 6. The PR notes the demo 'was not functional without multiple bug fixes' (ClippingContext cache key, stencil clear in the WebGL backend, hardware clipping state). Gotchas from forum threads: renderer.stencil cannot be switched on after construction. Post-processing render targets need { stencilBuffer: true }; RenderTarget default stencilBuffer is false, and EffectComposer's default target is new WebGLRenderTarget(w*pr, h*pr, { type: HalfFloatType }). The technique 'doesn't work for semi-transparent materials'. Apply stencil groups per closed geometry. The mesh must be closed and watertight (in/out parity). Cheaper alternative: render back faces flat via gl_FrontFacing (view-dependent, unlit). For exact section outlines, three-mesh-bvh's clippedEdges example (MIT, v0.9.15) extracts clip edges in real time on 2M-polygon models; three-bvh-csg (MIT, 0.0.18) gives true CSG cuts.

Sources:
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_clipping_stencil.html
- https://github.com/mrdoob/three.js/pull/34325
- https://discourse.threejs.org/t/clipping-plane-stencil-capping/74018
- https://discourse.threejs.org/t/capping-clipped-planes-using-stencil-on-a-buffergeometry/18407?page=3
- https://raw.githubusercontent.com/mrdoob/three.js/dev/src/core/RenderTarget.js
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/postprocessing/EffectComposer.js
- https://discourse.threejs.org/t/closing-up-clipped-planes-using-shaders/18030
- https://gkjohnson.github.io/three-mesh-bvh/example/bundle/clippedEdges.html

## 3a. SDF construction (Inigo Quilez, code snippets MIT-licensed)  _(confidence: high)_

Quadratic smin: k *= 4.0; h = max(k-abs(a-b),0.0)/k; return min(a,b) - h*h*k*(1.0/4.0). Cubic: k *= 6.0; return min(a,b) - h*h*h*k*(1.0/6.0). Quartic: k *= 16/3. Circular: k *= 1/(1-sqrt(0.5)). With this normalisation, k equals the maximum thickening, which is also the bounding-box expansion needed. Mix-factor version for blending region or material weights (quadratic): h = 1 - min(abs(a-b)/(4k), 1); w = h*h; m = w*0.5; s = w*k; return a<b ? vec2(a-s, m) : vec2(b-s, 1-m). distfunctions: opSmoothUnion(a,b,k){ k*=4; h=max(k-abs(a-b),0); return min(a,b) - h*h*0.25/k; }; opSmoothSubtraction(a,b,k) = -opSmoothUnion(a,-b,k); opSmoothIntersection = -opSmoothUnion(-a,-b,k). All three are labelled 'bound'. sdEllipsoid (lower bound, not exact): k0 = length(p/r); k1 = length(p/(r*r)); return k0*(k0-1.0)/k1. opOnion: abs(sdf)-thickness. Licence statement: 'all technical code snippets you'll find are under the MIT license'. Myocardium shell = max(smin_union(outer ellipsoids), -min(cavity ellipsoids)), or a smooth max. The result is closed, with the cavities as inner surfaces.

Sources:
- https://iquilezles.org/articles/smin/
- https://iquilezles.org/articles/distfunctions/
- https://iquilezles.org/articles/

## 3b. Meshers: MarchingCubes addon vs isosurface / surface nets / manifold-3d  _(confidence: high)_

three/addons/objects/MarchingCubes.js: constructor(resolution, material, enableUvs=false, enableColors=false, maxPolyCount=10000). field = Float32Array(size^3); delta = 2.0/size, so the grid spans [-1,1]. isolation defaults to 80.0 (metaball convention, positive field inside). Methods: addBall, addPlaneX/Y/Z, setCell/getCell, blur, reset, update. Normals come from the field gradient. It writes non-indexed dynamic buffers (DynamicDrawUsage) with drawRange = count. It is designed for animated metaballs; a 128^3 heart (about 94k tris) would exceed maxPolyCount=10000. isosurface (npm 1.0.0, MIT, Mikola Lysenko, last code push 2014, CommonJS): surfaceNets / marchingCubes / marchingTetrahedra(dims, potential(x,y,z), bounds=[lo,hi]) returns { positions, cells } as triangles (arrays of arrays). surface-nets 1.0.2 is MIT. The 0fps benchmark on a 65^3 volume (2012 browsers): marching cubes 145.8 ms / 77,504 verts / 38,752 faces; marching tetrahedra 620 ms / 167,781 verts; surface nets 74.54 ms / 37,749 verts / 18,874 faces. At frequency 10: MC 274.6 ms, SN 124.3 ms / 73,133 verts. manifold-3d 3.5.4 (Apache-2.0, WASM): Manifold.levelSet(sdf, bounds, edgeLength, level?, tolerance?) uses 'a form of Marching Tetrahedra (akin to Marching Cubes, but better for manifoldness)'. Its SDF sign: 'Positive values are inside, negative outside' (opposite of the IQ convention). getMesh() returns vertProperties, triVerts, numProp. Other MIT options: three-bvh-csg 0.0.18, three-mesh-bvh 0.9.15.

Sources:
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/objects/MarchingCubes.js
- https://github.com/mikolalysenko/isosurface
- https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/
- https://manifoldcad.org/docs/jsuser/classes/Manifold.html
- npm view isosurface / surface-nets / manifold-3d / three-bvh-csg / three-mesh-bvh (2026-10-07)

## 4. Per-vertex colour and deformation: BufferAttribute updates vs shader  _(confidence: high)_

BufferAttribute.needsUpdate is a 'Flag to indicate that this attribute has changed and should be re-sent to the GPU'. usage defaults to StaticDrawUsage; 'After the initial use of a buffer, its usage cannot be changed'. addUpdateRange(start,count) and clearUpdateRanges() are available; version increments on each needsUpdate. In WebGLAttributes.updateBuffer, with no updateRanges the whole array goes up via gl.bufferSubData(bufferType, 0, array). With ranges, one bufferSubData per range, after merging adjacent ranges ('performance improvements ... Likely due to GPU command overhead'). MDN WebGL best practices: 'Do as much work as you can in the vertex shader'. Guaranteed minimums: MAX_VERTEX_UNIFORM_VECTORS 128, MAX_FRAGMENT_UNIFORM_VECTORS 64 (WebGL1 baseline), so 12-24 region floats as uniforms fit easily. onBeforeCompile works on WebGL only; pair it with customProgramCacheKey. Colour: 'Components of THREE.Color objects and vertex colors are always in Linear-sRGB' (r152). Custom ShaderMaterial output needs #include <tonemapping_fragment> and <colorspace_fragment> (renamed from encodings_fragment in r154). Morph targets (geometry.morphAttributes + mesh.morphTargetInfluences, values in [0,1]) are GPU-blended and updated as uniforms; they suit whole-chamber systole/diastole but not region-by-region timing. Size arithmetic (mine): 60k verts x RGB float32 = 720 KB per frame; with position and normal about 2.16 MB per frame plus CPU normal recompute. Static attributes plus a uTime uniform cost 0 bytes per frame.

Sources:
- https://threejs.org/docs/pages/BufferAttribute.html
- https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/webgl/WebGLAttributes.js
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://threejs.org/docs/pages/Material.html
- https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791
- https://threejs.org/docs/pages/Mesh.html

## 5. Conduction-system pulses, bloom, heart-vector arrow  _(confidence: high)_

TubeGeometry(path: Curve, tubularSegments=64, radius=1, radialSegments=8, closed=false). generateUVs: uv.x = i/tubularSegments runs along the path; uv.y = j/radialSegments runs around it. A pulse shader can map uv.x to arrival time: t_arr = t0 + uv.x*L/v. UnrealBloomPass(resolution, strength=1, radius in [0,1], threshold): nMips = 5, blur kernel sizes [6,10,14,18,22], internal targets HalfFloatType with depthBuffer false. Selective bloom example: BLOOM_SCENE = 1 layer; darkMaterial = MeshBasicMaterial({color:'black'}) swapped onto non-bloom objects; bloomComposer has renderToScreen=false; finalComposer uses a mix ShaderPass computing texture2D(baseTexture) + texture2D(bloomTexture)*bloomStrength, then OutputPass. GUI defaults threshold 0, strength 1, radius 0.5, exposure 1. OutputPass handles tone mapping and colour-space conversion and 'should be included at the end of each pass chain'. WebGPU equivalent: scenePass.setMRT(mrt({ output, bloomIntensity: float(0) })); bloom() from 'three/addons/tsl/display/BloomNode.js'; material.mrtNode = mrt({ bloomIntensity: uniform(0|1) }); new THREE.RenderPipeline(renderer). ArrowHelper(dir (must be normalized), origin, length=1, color=0xffff00, headLength=0.2*length, headWidth=0.2*headLength); methods setDirection(dir), setLength(length, headLength, headWidth), setColor, dispose. LineBasicMaterial.linewidth: 'WebGL and WebGPU ignore this setting and always render line primitives with a width of one pixel'.

Sources:
- https://threejs.org/docs/pages/TubeGeometry.html
- https://raw.githubusercontent.com/mrdoob/three.js/dev/src/geometries/TubeGeometry.js
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/postprocessing/UnrealBloomPass.js
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_postprocessing_unreal_bloom_selective.html
- https://threejs.org/docs/pages/OutputPass.html
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_postprocessing_bloom_selective.html
- https://threejs.org/docs/pages/ArrowHelper.html
- https://threejs.org/docs/pages/LineBasicMaterial.html

## 6a. Prior art: open-source browser heart + 12-lead ECG apps (licences checked via GitHub API)  _(confidence: high)_

(1) Gelato1337/heart-ekg-simulator: NO LICENSE (all rights reserved; study only); last push 2026-10-02. Single HTML file loading three.js r128 from cdnjs. 'Each lead's trace is the dipole projected onto that lead's axis'. 14 conditions (NSR, brady/tachy, AF, PVC, VT, VF, 3rd-degree AVB, LBBB, RBBB, anterior and inferior STEMI, hyperkalaemia, asystole). 'Look from this lead' camera; 30 s scrub. Heart meshes are BodyParts3D (stated as CC BY-SA 2.1 JP), segmented into chambers and decimated. Live: https://gelato1337.github.io/heart-ekg-simulator/. (2) SeraKah-1/cardiac-3d-ecg-simulator ('CardioSim 3D'): MIT; React 19, three r182, Vite 8.3. Model: Phi_i = S*(L_i . P(t)), L_i = kappa*(r_i - r_0)/|r_i - r_0|^3, kappa = 1.085, S = 0.05. Claimed lead II R 1.29 mV, P 0.15 mV, T 0.34 mV; anterior-STEMI V2 ST 2.47 mV; dt = 2 ms (500 Hz); asserts I + III = II. README claims are unverified. (3) ashukuri/ecg-heart-simulator: NO LICENSE; React + TS + Vite + Tailwind + SVG; 26 diseases; 25 mm/s and 10 mm/mV; 0.25x slow motion; 'Master Timeline' syncing conduction (SA/AV/His/BB/Purkinje), activation front, de/repolarization and contraction with the 12 leads. (4) infocusp/ecg-atlas: code MIT; assets licensed separately: anatomy CC BY 4.0 (Plethscape-processed BodyParts3D 4.0 + HRA lung v1.4), Draco Apache-2.0, ECG excerpts from PTB (ODC-By 1.0), PTB-XL 1.0.3 (CC BY 4.0) and CU VT DB (ODC-By 1.0). About 10 MB of model assets; Vite static build; Node 24 or 22.12+; Playwright browser tests. (5) kevmasajedi/Cardiobit: MIT, ECG platform, inactive since 2021. (6) seanwkelley/ecg-simulator: MIT, 20 rhythms, 12-lead view, 2D only.

Sources:
- https://github.com/Gelato1337/heart-ekg-simulator
- https://github.com/SeraKah-1/cardiac-3d-ecg-simulator
- https://github.com/ashukuri/ecg-heart-simulator
- https://github.com/infocusp/ecg-atlas
- https://github.com/kevmasajedi/Cardiobit
- https://github.com/seanwkelley/ecg-simulator

## 6b. Prior art: model-based ECG generators (ECGSYN, Sameni/OSET, ECGSIM)  _(confidence: high)_

ECGSYN (McSharry PE, Clifford GD, Tarassenko L, Smith L. IEEE Trans Biomed Eng 2003;50(3):289-294): three coupled ODEs; C, Java and Matlab code under GPL-3.0 on PhysioNet. Matlab defaults: sfecg 256 Hz, sfint 512 Hz (must be an integer multiple of sfecg), hrmean 60 bpm, lfhfratio 0.5, Anoise 0 mV. ti = [-70 -15 0 15 100] deg (P,Q,R,S,T angles of extrema); ai = [1.2 -5 30 -7.5 0.75] (z-position of extrema, i.e. amplitude); bi = [0.25 0.1 0.1 0.1 0.4] (Gaussian width). Rate scaling: hrfact = sqrt(hrmean/60); bi = hrfact*bi; ti = [hrfact2 hrfact 1 hrfact hrfact2].*ti. Sameni R, Clifford GD, Jutten C, Shamsollahi MB. EURASIP J Adv Signal Process 2007:43407: single-dipole 3D dynamic VCG model plus a linear body-surface model (lead matrix, rotation, scaling). Article is open access (CC BY). OSET (alphanumericslab/OSET, repo LICENSE BSD-3-Clause 2021; older 2006 file headers say GPL) test_ecg_gen_noisy.m: fs = 500, F = 0.9 Hz, teta0 = -pi/3. tetai.x = [-1.09 -0.83 -0.19 -.07 0 .06 0.22 1.2 1.42 1.68 2.9]; alphai.x = [0.03 .08 -0.13 .85 1.11 .75 0.06 0.1 0.17 0.39 .03]; bi.x = [0.0906 0.1057 0.0453 0.0378 0.0332 0.0302 0.0378 0.6040 0.3020 0.1812 .5]. tetai.y = [-1.1 -0.9 -0.76 -0.11 -.01 0.065 0.8 1.58 2.9]; alphai.y = [0.035 0.015 -0.019 0.32 .51 -0.32 0.04 0.08 .014]; bi.y = [0.07 .07 0.04 0.055 0.037 0.0604 0.450 0.3 .5]. tetai.z = [-1.1 -0.93 -0.7 -.4 -0.15 .095 1.05 1.25 1.55 2.8]; alphai.z = [-0.03 -0.14 -0.035 .045 -0.4 .46 -.12 -.2 -.35 -.035]; bi.z = [.03 .12 .04 .4 .045 .05 .8 .4 .2 .4]. Lead matrix: H(i,j) = k*((ElecPos(i,j)-h_j)/|ElecPos_i - h|^3 - (ElecNeg(i,j)-h_j)/|ElecNeg_i - h|^3), with k = 1 and heart location [-25 7 20] relative to the navel. This is the same infinite-homogeneous-medium dipole formula the app plans to use. ECGSIM (van Oosterom A, Oostendorp TF. Heart 2004;90:165-168): source model is the equivalent double layer, with transfer factors from a realistic thorax model; users edit ventricular-surface depolarization and repolarization timing and local source strength. 'installed free of charge from www.ecgsim.org'; a free binary, not open source.

Sources:
- https://physionet.org/content/ecgsyn/1.0.0/
- https://physionet.org/files/ecgsyn/1.0.0/Matlab/ecgsyn.m
- https://dspace.mit.edu/handle/1721.1/67338
- https://github.com/alphanumericslab/OSET/blob/master/matlab/tests/synthetic-ecg-generator/test_ecg_gen_noisy.m
- https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC1768085
- https://heart.bmj.com/content/90/2/165

## 7. Openly licensed 3D heart models (reference only)  _(confidence: medium)_

BodyParts3D (DBCLS): current licence CC BY 4.0, page updated 2025-02-27. Required attribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'. Older releases were CC BY-SA 2.1 Japan, which is the licence Gelato1337 cites. Release 4.0 OBJ: isa_BP3D_4.0_obj_99.zip. Z-Anatomy (built on BodyParts3D; Blender): CC BY-SA 4.0 (share-alike affects derived models). NIH 3D (3d.nih.gov): licence varies per entry. 3DPX-011381 'Modelo CAD basado en CT (Corazon)' is CC-BY; 3DPX-001549 and 3DPX-022787 'Human Heart 3d Model' are public domain; 3DPX-000900 'Heart (CT)' is CC-BY-NC. Formats: STL/VRML/X3D/Blender. HRA/HuBMAP 3D reference organs are CC BY 4.0; ecg-atlas uses the HRA lung v1.4 (DOI 10.48539/HBM532.KLZD.394). Sketchfab: CU Anschutz plastinated hearts ('whole human heart', 'whole heart with great vessels') are CC BY-NC-SA; '2017000 Normal Heart. Aortic Dissection' and 'Normal HEART' (CT-angio segmentation) are listed as CC Attribution.

Sources:
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- https://github.com/infocusp/ecg-atlas/blob/main/public/ATTRIBUTION.md
- https://github.com/Z-Anatomy/Models-of-human-anatomy
- https://3d.nih.gov/entries/3DPX-011381
- https://3d.nih.gov/entries/3DPX-022787
- https://3d.nih.gov/entries/3DPX-000900/2
- https://sketchfab.com/3d-models/whole-human-heart-1a5f637d2b8147d3ad29470c89e27c27
- https://sketchfab.com/3d-models/normal-heart-ff1d3be75b7241c3ba4d652df7ea0509

## 8a. ECG paper and layout conventions  _(confidence: high)_

Grid: 'A small box is 1 mm x 1 mm and represents 0.1 mV x 0.04 seconds. A large box is 5 mm x 5 mm and represents 0.5 mV x 0.20 seconds'. Standard speed 25 mm/s (some countries use 50 mm/s); gain 10 mm/mV. LITFL: 1 small square = 0.04 s (40 ms); 5 large squares = 1 s; 1500 small = 300 large squares = 1 min (basis of the 300/1500 rate rules); a rhythm strip is 250 small squares = 50 large squares = 10 s. 12-lead report: 'a 2.5 second tracing of each of the twelve leads ... four columns and three rows'. Column 1 I/II/III, column 2 aVR/aVL/aVF, columns 3-4 V1-V3 and V4-V6, with an optional rhythm-strip 4th row ('3x4+1'). Commercial carts also offer 6x2. Governing standard: Kligfield P et al., AHA/ACCF/HRS Recommendations for the standardization and interpretation of the ECG, Part I, Circulation 2007;115:1306-1324 (PMID 17322457; DOI 10.1161/CIRCULATIONAHA.106.180200). Full text could not be fetched (403); the bandwidth figures are therefore in 'unsourced'. 'Erase bar' monitor display is described in patent US5953018.

Sources:
- https://en.wikipedia.org/wiki/Electrocardiography
- https://litfl.com/ecg-rate-interpretation/
- https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1161/CIRCULATIONAHA.106.180200
- https://patents.google.com/patent/US5953018

## 8b. Canvas 2D high-DPI and performance practices  _(confidence: high)_

MDN HiDPI pattern: set canvas.style.width/height in CSS px; canvas.width = Math.floor(size * devicePixelRatio); ctx.scale(dpr, dpr). Detect DPR or zoom changes with matchMedia(`(resolution: ${devicePixelRatio}dppx)`) plus a 'change' listener. MDN WebGL best practices warn that canvas.width = width*devicePixelRatio 'will cause moire artifacts with non-integer values of devicePixelRatio'; prefer ResizeObserver with { box: 'device-pixel-content-box' } and entry.devicePixelContentBoxSize[0].inlineSize/blockSize. Support (MDN BCD): Chrome 84+, Firefox 108+ (93-107 buggy), Safari not supported, so fall back to contentBoxSize*DPR. MDN Optimizing canvas: pre-render repeated drawing to an offscreen canvas; use multiple layered canvases (static background, per-frame layer); getContext('2d', { alpha: false }); batch calls (one polyline per trace); avoid state changes; render only screen differences; avoid shadowBlur and text per frame; use requestAnimationFrame. Odd-width lines on integer coordinates look blurry (MDN 'Seeing blurry edges'), so offset 1-device-px grid lines by 0.5.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
- https://web.dev/articles/device-pixel-content-box
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ResizeObserverEntry.json

## 9. Misc three.js APIs for the animation loop  _(confidence: high)_

Timer (replaces Clock, which was deprecated in r183) is in core (src/core/Timer). Usage: const timer = new Timer(); timer.connect(document) (Page Visibility API avoids huge deltas after a tab switch); each frame timer.update(timestamp), then getDelta() / getElapsed() in seconds; setTimescale(0.5) gives slow motion (useful for the teaching 'slow beat' mode); dispose(). WebGLRenderer.setAnimationLoop(cb) is recommended over requestAnimationFrame.

Sources:
- https://threejs.org/docs/pages/Timer.html
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://github.com/mrdoob/three.js/wiki/Migration-Guide

## Recommendations

- Pin exact versions: three@0.186.1 and @types/three@0.186.0 (three has breaking changes every release; do not use ^), vite@8.3.3, vitest@5.0.3, typescript@7.0.2. Use Node 24 LTS: Vitest 5 needs >=22.12 and this machine has 24.15.
- tsconfig for TS 7: set "types": ["vite/client"] explicitly (default is now []), moduleResolution "bundler", module "esnext", strict true, noEmit true, and no baseUrl (it is a hard error now). Run 'tsc --noEmit' as the type check; Vite/Oxc only transpiles. If type-aware ESLint is needed, add typescript6 via npm alias, because 7.0 has no programmatic API.
- Use WebGLRenderer({ antialias: true, stencil: true }) with renderer.localClippingEnabled = true. Import addons from 'three/addons/...'. Use Timer plus renderer.setAnimationLoop. Keep WebGPURenderer as a later migration: stencil caps there only became workable in r186, onBeforeCompile is unavailable, and CPU and first-frame overhead are higher.
- Cross-section: use the parity method (one DoubleSide stencil mesh per plane with InvertStencilOp and stencilWriteMask = 1<<i; cap with NotEqual, funcMask = bit, Replace). renderOrder: stencil i+1, cap i+1.1, heart afterwards (e.g. 6). Update the cap each frame with plane.coplanarPoint plus lookAt(pos - normal).
- Make the cap a ShaderMaterial that computes colour from world position, by sampling a baked Data3DTexture (region id and/or activation time on a 64^3 grid) or by evaluating the analytic region SDFs. The cap cannot see the heart mesh's per-vertex attributes.
- Any vertex-shader displacement (contraction) must also be injected into the stencil-writing materials, or the caps will not line up with the deformed wall. Raycasting won't see that displacement, so pick against the rest-pose mesh.
- If you use EffectComposer, construct it with a custom WebGLRenderTarget({ type: HalfFloatType, stencilBuffer: true, depthBuffer: true, samples: 4 }) and end with OutputPass. In selective bloom, the darkening material must copy clippingPlanes, clipIntersection and side from the original material, or clipped regions will occlude the glowing conduction tubes.
- Heart mesh: one SDF. smin-union the outer chamber ellipsoids (quadratic smin with k of a few mm), then max(d, -cavities). Grid 96^3-128^3 over the bounding box plus a margin of at least k + 2 voxels, so no surface touches the grid edge and the mesh stays closed. Mesh with your own indexed surface nets (or isosurface, MIT); expect about 26k-47k verts, then computeVertexNormals. Run it in a Web Worker at startup or bake it at build time into a binary asset. Use manifold-3d.levelSet (negate the SDF) only if non-manifold edges appear.
- Bake per-vertex static attributes at mesh build: aRegion (uint8), aTAct and aTRep (ms, from the conduction graph), aContractDir (vec3 towards the chamber centroid). Animate colour and contraction in onBeforeCompile on MeshStandardMaterial with uTime plus a uniform float array per region (<=32 entries), and set customProgramCacheKey. Re-upload attributes only when the disease scenario changes, using addUpdateRange if partial. Keep colour maps in Linear-sRGB.
- Conduction system: CatmullRomCurve3 paths, then TubeGeometry (radius ~0.5-1 mm, radialSegments 8). The shader computes arrival = tStart + uv.x * pathLength / velocity and an emissive pulse window around uTime. Put the tubes on a bloom layer, or skip bloom and use additive blending for a cheaper glow.
- Heart vector H(t): build an arrow from CylinderGeometry + ConeGeometry (the ArrowHelper line is fixed at 1 px), oriented with a quaternion from (0,1,0) to normalize(H) and scaled by |H|. Optionally draw the VCG loop as a short trailing polyline (Line2 for thickness).
- ECG panel: two stacked canvases, a prerendered grid (1 mm minor / 5 mm major, alpha:false background) and a transparent trace layer. Size them with ResizeObserver device-pixel-content-box, falling back to contentBoxSize*DPR for Safari. Two display modes: (a) monitor sweep with an eraser gap that redraws only the new segment each frame; (b) static 3x4 sheet (2.5 s per column: I/II/III, aVR/aVL/aVF, V1-V3, V4-V6) plus a 10 s lead-II rhythm strip. Expose a px-per-mm calibration, since CSS mm is not physical.
- Sample the generated ECG at a fixed internal rate (e.g. 500-1000 Hz) on the simulation clock, separate from the render frame rate. Draw one polyline per lead per frame, decimating with min/max per device pixel column if there are more samples than pixels.
- Licences: copy nothing from Gelato1337/heart-ekg-simulator or ashukuri/ecg-heart-simulator (no licence) or from ECGSYN (GPL-3). CardioSim 3D and ecg-atlas code (MIT) and OSET (BSD-3) may be studied and reused with attribution. Parameter values (e.g. Sameni Gaussian tables) are data; cite the paper. If you use BodyParts3D, follow its CC BY 4.0 attribution text.

## Unsourced / design choices

- Local benchmark run by me (Node v24.15.0, this Windows machine, synthetic 6 outer + 4 cavity ellipsoids, quadratic smin k=6, 150 mm box). SDF grid evaluation: 64^3 = 106 ms, 96^3 = 306 ms, 128^3 = 692 ms. A naive surface-nets cell/quad pass took 41-121 ms and produced about 11,471 / 26,119 / 46,831 vertices (about 23k / 52k / 94k triangles) at voxel sizes 2.38 / 1.58 / 1.18 mm. Browser V8 should be similar but is unmeasured; a first unoptimised version (Math.hypot plus spread args) was 5x slower (551 / 1546 / 3883 ms).
- Upload-size arithmetic (60k verts x 3 floats x 4 B = 720 KB per attribute per frame) is my own calculation, not a measured cost.
- Bandwidth figures 0.05-150 Hz for adults, 250 Hz for children, and >=500 samples/s come from secondary sources (EP Lab Digest, GE Healthcare). The primary Kligfield 2007 statement (PMID 17322457, DOI 10.1161/CIRCULATIONAHA.106.180200) returned HTTP 403 and was not read.
- CSS 1 in = 96 px, so a nominal 3.78 CSS px/mm and 94.5 px/s at 25 mm/s. This is general knowledge (CSS Values spec, not fetched); CSS mm is not physically accurate on screens.
- Monitor sweep layout details (screen width of several seconds, eraser gap of about 10-20 px) are general knowledge, not from a standard.
- That shader displacement must be mirrored in the stencil materials, that the cap cannot read the heart's vertex attributes, and that three's Raycaster ignores vertex-shader displacement are my engineering reasoning from how the techniques work, not quoted docs.
- The WebGL2 (GLES 3.0) minimum MAX_VERTEX_UNIFORM_VECTORS of 256 is from memory; MDN, as fetched, lists the WebGL1-level minima of 128 vertex and 64 fragment vectors.
- The fetched summary of UnrealBloomPass.js said tone mapping 'must be enabled'; I did not verify that exact JSDoc wording.
- Licence of the HRA heart reference organ itself (as opposed to the HRA lung used in ecg-atlas) was not verified; the page did not render.
- CardioSim 3D README numbers (kappa = 1.085, S = 0.05, lead II R 1.29 mV, etc.) are the author's claims; the code was not audited and the README looks partly auto-generated.
- Suggested parameter values (smin k of a few mm, tube radius 0.5-1 mm, Data3DTexture 64^3, <=32 region uniforms, ECG internal sampling 500-1000 Hz) are design suggestions, not sourced facts.
- Sketchfab licence labels were taken from search-result snippets; check each model page before any use.
