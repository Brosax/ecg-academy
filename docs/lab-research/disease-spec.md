# Research: disease-spec

> Generated 2026-10-08 by read-only research agents. Numbers carry citations; items under "Unsourced" are general knowledge or design choices and must be treated as tunable.

## Summary

Disease/rhythm library + test oracle for a single-source (activation graph -> heart dipole H(t) -> 10 electrodes -> WCT -> 12 leads) ECG simulator. 40 entries with numeric criteria, mechanism, model hooks, 3D animation spec and machine-checkable assertions. CONVENTIONS used throughout (design choices, see unsourced): body frame +x = patient left, +y = inferior (feet), +z = anterior; frontal angle theta = atan2(y,x) so hexaxial I=0, II=+60, aVF=+90, III=+120, aVL=-30, aVR=-150 deg (LITFL axis page). Amplitudes in mV (1 mm = 0.1 mV at 10 mm/mV). ST measured at J point vs PR-segment (isoelectric) baseline as in the Universal Definition of MI; slope checked J -> J+60/80 ms. Intervals measured globally across 12 leads. Diseases may only change: (a) rhythm generator (SA period, RR modulation, ectopic triggers, coupling interval), (b) conduction graph (edge delay, block, decremental AV-node curve, accessory edge, reentry loop), (c) region parameters (activation weight/amplitude, APD, transmural APD gradient, conduction velocity), (d) additive 3D vectors (ST injury vector during plateau, PR/atrial injury vector, J/Osborn notch vector) - never per-lead edits. Key sourcing notes: AHA/ACCF/HRS 2009 Parts III/IV/VI and several LITFL pages returned HTTP 403, so Part III bundle-branch/fascicular criteria are relayed via ecgpedia and Wikipedia (underlying ref Surawicz B et al. Circulation 2009;119:e235-e240), and STEMI/Q-wave thresholds via wikem/ecgpedia/EM sources (underlying ref Thygesen K et al., Fourth Universal Definition of MI, Eur Heart J 2019;40:237-269 / Circulation 2018;138:e618-e651). Conflicts resolved: incomplete RBBB 110-120 ms (ecgpedia/AHA) chosen over 100-120 ms (Wikipedia/Floria 2021); sinus bradycardia oracle <60 bpm (LITFL convention) with note that 2018 ACC/AHA/HRS uses <50 bpm; normal QTc upper limit 440 men/460 women (LITFL) with ecgwaves 450/460 noted; Brugada type 1 uses 2016 J-wave consensus wording (>=2 mm in >=1 of V1-V3 at 4th/3rd/2nd ICS) over LITFL wording; hyperkalemia sine-wave threshold >7.0 (Levis 2013) vs >9.0 (LITFL) - both noted. Priority: P1-core = teaching backbone (sinus rhythms, PAC/PVC, AF, flutter, AV blocks, BBBs, WPW, anterior/inferior/lateral STEMI, LVH, hyperK, VT, VF); P2 = fascicular blocks, posterior MI, NSTEMI, old MI, RVH, hypoK, LQTS, TdP, pericarditis, Brugada, AVNRT, junctional, sinus arrhythmia; P3 = Ca disorders, hypothermia, digoxin, PE.

## Normal adult 12-lead reference

Normal adult 12-lead reference (for NSR config and as baseline for all oracles). RATE 60-100 bpm (ecgpedia Normal_Tracing; 2018 ACC/AHA/HRS uses 50-100). P WAVE: duration <120 ms; amplitude <2.5 mm (0.25 mV) limb, <1.5 mm (0.15 mV) precordial; axis 0 to +75 deg; upright I and II (and aVF), inverted aVR, biphasic V1 with terminal negative part normally <1 mm (0.1 mV) and <40 ms; first third RA, last third LA (LITFL P wave; ecgwaves). LAE: bifid P in II, V1 terminal negative >40 ms wide and >1 mm deep; RAE: P in II >2.5 mm. PR 120-200 ms (LITFL; ecgwaves allows up to 220 ms in older adults); <120 ms = pre-excitation or junctional; >200 ms = 1st-degree block. QRS: 60-100 ms typical (ecgpedia), abnormal >=120 ms, incomplete BBB 110-120 ms; R-peak time V1-V2 <35 ms, V5-V6 <45 ms (ecgwaves). AXIS: normal -30 to +90 deg; LAD < -30; RAD > +90; extreme -90 to 180; hexaxial I 0, II +60, III +120, aVF +90, aVL -30, aVR -150 (LITFL axis). AMPLITUDES (ecgwaves): R in I, II, III <= 20 mm (2.0 mV); R aVL <= 11-12 mm (1.1-1.2 mV); R V5-V6 < 26 mm (2.6 mV); SV1 + RV5 (or RV6) < 35 mm (3.5 mV); R in V1 if dominant < 5 mm. R-WAVE PROGRESSION (gpnotebook): rS in V1, R grows and S shrinks toward V6; transition zone (R/S becomes >1) generally at V3 or V4; early transition at V2 can be normal; delayed to V4-V5 at times; R in V3 normally > 2 mm; poor R progression = R < 2-4 mm in V3 or V4 and/or reversed progression (RV4<RV3, RV3<RV2, RV2<RV1). Q WAVES: small septal q in I, aVL, V5-V6 normal; pathological per Universal Definition (see old-MI entry). ST: isoelectric; depression <0.5 mm (0.05 mV) acceptable (ecgwaves); J-point elevation upper limits = STEMI thresholds (V2-V3: 0.2 mV men >=40, 0.25 mV men <40, 0.15 mV women; 0.1 mV other leads). T WAVE: upright in all leads except aVR and V1; inversion in III (and isolated aVL) normal variant; aVR T negative; amplitude <5 mm (0.5 mV) limb (ecgwaves: rarely >6 mm), precordial <10 mm men / <8 mm women (LITFL T wave, ecgwaves); T concordant with QRS (ecgpedia). aVR: P and T negative (sourced); QRS predominantly negative (standard, see unsourced). U WAVE: ~1/4-1/3 of T amplitude, best V2-V3. QT/QTc: men <440 ms, women <460 ms (LITFL; ecgwaves <450/<460; ecgpedia 390-450); >500 ms TdP risk; short <350 ms (LITFL); QT < half RR rule of thumb; measure in lead with longest QT (II or V5-V6), tangent (maximum slope) method; Bazett QT/sqrt(RR), Fridericia QT/RR^(1/3), Framingham QT+0.154(1-RR), Hodges QT+1.75(HR-60) (Bazett over-corrects >100 bpm, under-corrects <60). NORMAL ACTIVATION (Durrer 1970, Circulation 41:899): three LV endocardial areas excited 0-5 ms after onset of LV activity (high anterior paraseptal below mitral valve; central left septal surface; posterior paraseptal ~1/3 apex-to-base), confluent by 15-20 ms; posterobasal LV usually last. CONDUCTION (cvphysiology a003): SA->atrial ~0.5 m/s; AV node ~0.05 m/s; bundle branches ~2 m/s; Purkinje ~4 m/s; atrial depolarization complete in ~90 ms. POPULATION LIMITS: Rijnbeek PR et al. J Electrocardiol 2014;47:914-921 (n=13,354, ages 16-90, 2nd/98th percentiles by age/sex; tables at normalecg.org - site TLS error, not retrieved). Posterior leads V7 (left posterior axillary line), V8 (tip of left scapula), V9 (left paraspinal), same horizontal plane as V6 (LITFL posterior MI).

## Normal sinus rhythm / 正常窦性心律  `normal-sinus-rhythm`  (normal-sinus, P1-core)

**rate_rhythm**: 60-100 bpm (ecgpedia; 2018 ACC/AHA/HRS treats 50-100 as normal). Regular, P-P variation <120 ms. 1:1 P:QRS, each QRS preceded by sinus P with constant PR.

**intervals**: P <120 ms; PR 120-200 ms; QRS 60-100 ms (upper limit <120); QTc <440 ms men / <460 ms women (LITFL; ecgwaves uses <450/<460); R-peak time V1-V2 <35 ms, V5-V6 <45 ms.

**lead_features**: QRS axis -30 to +90 deg; P axis 0 to +75 deg; P upright I, II, aVF, inverted aVR, biphasic V1 (terminal negative <0.1 mV); P amplitude <0.25 mV limb, <0.15 mV precordial. rS in V1, R grows/S shrinks to V6, transition (R/S>1) V3-V4. R I/II/III <=2.0 mV, R aVL <=1.1-1.2 mV, R V5-V6 <2.6 mV, SV1+RV5 <3.5 mV. ST isoelectric (depression <0.05 mV). T upright in all leads except aVR and V1 (III and isolated aVL inversion = normal variant); T <0.5 mV limb, <1.0 mV (men)/<0.8 mV (women) precordial. aVR: P and T negative, QRS predominantly negative. Septal q in I, aVL, V5-V6.

**mechanism**: SA node (high RA) -> RA (first third of P) -> Bachmann bundle -> LA (last third of P) -> AV node delay (0.05 m/s) -> His -> bundle branches (~2 m/s) -> Purkinje (~4 m/s). LV septum activated left-to-right first; three LV endocardial sites activate 0-5 ms after LV onset (high anterior paraseptal, central left septal, posterior paraseptal), confluent by 15-20 ms; posterobasal LV last (Durrer 1970). Repolarization epicardium-before-endocardium makes T concordant with QRS.

**model_implementation**: Baseline graph, no modifications. SA period = 60/HR s (e.g. 0.857 s at 70 bpm). Atrial dipole: wavefront from superior-posterior RA spreading leftward-inferior -> P vector ~+45..+60 deg. AV node fixed delay so PR 140-180 ms. Ventricles: septal region first with dipole pointing rightward-anterior (-x,+z) for ~10-20 ms (gives septal q in I/V6, r in V1); then apical/free-wall dipole leftward-inferior-posterior (main QRS ~+30..+60 deg); late posterobasal dipole superior-posterior. Repolarization term: APD shorter in epicardium than endocardium and shorter at apex than base so T vector is concordant with QRS. All 12 leads arise by projection.

**animation_3d**: SA node flash -> atrial activation color wave (synchronized with P), AV node pulsing during PR segment, His/bundle/Purkinje streak, ventricular isochrone map septum->apex->free wall->posterobasal LV (QRS), uniform plateau color (ST), repolarization wave epi->endo/apex->base (T). Atrial contraction shortly after P, ventricular contraction starting after QRS, relaxation after T. Cursor on ECG synchronized with heart time.

**test_oracle**:
- 60 <= HR <= 100 bpm and max(PP)-min(PP) < 120 ms
- every QRS preceded by exactly one P; 120 ms <= PR <= 200 ms; PR SD < 10 ms
- P net positive in I, II, aVF; P net negative in aVR; P duration < 120 ms; P amplitude in II < 0.25 mV
- QRS duration < 120 ms (target 80-100 ms)
- frontal QRS axis (atan2 of net QRS area aVF vs I) within [-30, +90] deg
- net QRS and T negative in aVR
- R/S < 1 in V1; R/S > 1 in V5 and V6; first precordial lead with R/S >= 1 is V3 or V4
- R amplitude increases monotonically V1 -> V4
- |ST(J)| < 0.1 mV in all leads except V2-V3 (< 0.2 mV)
- T net positive in I, II, V3-V6
- SV1 + RV5 < 3.5 mV; R aVL < 1.1 mV
- QTc (Bazett) 350-440 ms (male config)

Sources:
- https://en.ecgpedia.org/wiki/Normal_Tracing
- https://litfl.com/p-wave-ecg-library/
- https://litfl.com/pr-interval-ecg-library/
- https://litfl.com/t-wave-ecg-library/
- https://litfl.com/ecg-axis-interpretation/
- https://litfl.com/qt-interval-ecg-library/
- https://ecgwaves.com/topic/ecg-normal-p-wave-qrs-complex-st-segment-t-wave-j-point/
- https://gpnotebook.com/pages/cardiovascular-medicine/r-wave-progression
- https://cvphysiology.com/arrhythmias/a003
- Durrer D et al. Total excitation of the isolated human heart. Circulation 1970;41:899-912

## Sinus bradycardia / 窦性心动过缓  `sinus-bradycardia`  (normal-sinus, P1-core)

**rate_rhythm**: Sinus rhythm <60 bpm (conventional; 2018 ACC/AHA/HRS bradycardia guideline defines bradycardia/sinus node dysfunction as <50 bpm, or pauses >=3 s). Regular, 1:1.

**intervals**: PR 120-200 ms, QRS <120 ms; absolute QT longer but QTc normal.

**lead_features**: Identical P/QRS/T morphology and axis to NSR; P upright I, II; inverted aVR.

**mechanism**: Reduced SA-node automaticity (vagal tone, athletes, beta-blockers, hypothermia, hypothyroidism, inferior MI).

**model_implementation**: Rhythm generator only: SA period > 1000 ms (e.g. 1.20 s = 50 bpm). Keep graph unchanged. Apply APD rate-adaptation (longer RR -> longer APD) so QT lengthens but QTc stays normal.

**animation_3d**: Same activation sequence as NSR at slower tempo; SA node flashes less frequently; longer diastolic pause shown as relaxed ventricles.

**test_oracle**:
- HR < 60 bpm (configurable; 50 bpm default)
- RR regular: max(RR)-min(RR) < 120 ms
- each QRS preceded by P with PR 120-200 ms
- P axis within 0..+75 deg; P positive in I, II
- QRS morphology correlation with NSR template >= 0.95; QRS < 120 ms
- QTc (Bazett or Fridericia) within NSR range

Sources:
- https://www.acc.org/about-acc/press-releases/2018/11/06/13/31/societies-publish-new-guidance-for-the-treatment-of-slow-irregular-heartbeats
- https://www.cardiosmart.org/news/2018/11/bradycardia-guideline-2018
- https://en.ecgpedia.org/wiki/Normal_Tracing
- https://litfl.com/qt-interval-ecg-library/

## Sinus tachycardia / 窦性心动过速  `sinus-tachycardia`  (normal-sinus, P1-core)

**rate_rhythm**: Sinus rhythm >100 bpm, regular, 1:1. Most common ECG abnormality in PE (44%).

**intervals**: PR normal or shortened (>=120 ms); QRS <120 ms; QT shortens with rate (Bazett over-corrects >100 bpm - prefer Fridericia/Framingham).

**lead_features**: Normal sinus P axis/morphology; at high rates P may merge with preceding T; may show rate-related J-point/upsloping ST depression (non-specific).

**mechanism**: Increased SA automaticity (sympathetic drive: fever, hypovolemia, pain, PE, thyrotoxicosis).

**model_implementation**: Rhythm generator: SA period < 600 ms (e.g. 0.50 s = 120 bpm). Sympathetic modifier: reduce AV-node delay (PR toward 120-140 ms) and apply APD rate-adaptation (shorter APD -> shorter QT). No graph changes.

**animation_3d**: Faster SA flashes, shortened diastole; same activation map; P wave approaching preceding T on the trace with synchronized cursor.

**test_oracle**:
- HR > 100 bpm
- each QRS preceded by P with P axis 0..+75 deg and PR >= 120 ms
- QRS morphology correlation with NSR template >= 0.95; QRS < 120 ms
- RR regular (max-min < 60 ms)
- QT (absolute) < NSR QT; QTc (Fridericia) within normal range

Sources:
- https://en.ecgpedia.org/wiki/Normal_Tracing
- https://litfl.com/qt-interval-ecg-library/
- https://litfl.com/ecg-changes-in-pulmonary-embolism/

## Sinus arrhythmia (respiratory) / 窦性心律不齐  `sinus-arrhythmia`  (normal-sinus, P2-important)

**rate_rhythm**: Sinus P waves with P-P variation >120 ms (3 small boxes), cyclic lengthening/shortening corresponding to respiration; constant PR, constant P morphology.

**intervals**: PR constant 120-200 ms; QRS normal.

**lead_features**: Normal sinus P (upright I, II) with unchanged morphology; QRS/T unchanged.

**mechanism**: Respiratory modulation of vagal tone on the SA node (physiological, common in young people).

**model_implementation**: Rhythm generator: SA period modulated sinusoidally, T_SA(t) = T0 x (1 + a x sin(2 pi f_resp t)), f_resp ~0.2-0.3 Hz, a chosen so that max(PP)-min(PP) = 150-250 ms. Graph untouched.

**animation_3d**: Optional breathing lungs/chest indicator synced with SA rate speeding and slowing; activation pattern identical to NSR.

**test_oracle**:
- max(PP) - min(PP) > 120 ms over >= 2 respiratory cycles
- PP sequence periodic with period matching f_resp (autocorrelation peak)
- PR SD < 10 ms
- P morphology correlation across beats >= 0.95
- QRS < 120 ms; morphology equals NSR

Sources:
- https://litfl.com/sinus-arrhythmia-ecg-library/

## Premature atrial contraction (PAC) / 房性早搏  `premature-atrial-contraction`  (supraventricular, P1-core)

**rate_rhythm**: Underlying sinus; premature abnormal P' with different morphology/axis; usually followed by normal QRS (<120 ms). Post-extrasystolic pause is NOT compensatory (SA node reset; pause not equal to 2x RR). May be blocked (P' without QRS) or aberrant (usually RBBB morphology since RBB refractory period is longer). P' may hide in preceding T (peaked/camel-hump T).

**intervals**: P'R >= 120 ms (low atrial ectopic: inverted P' with relatively short PR >= 120 ms; PR <120 ms would be classified as a premature junctional complex). QRS <120 ms unless aberrant.

**lead_features**: P' axis differs from sinus: low atrial focus -> inverted P' in II, III, aVF; left atrial focus -> negative P' in I/aVL. QRS identical to sinus unless aberrant (RBBB pattern: rsR' V1).

**mechanism**: Ectopic atrial focus fires before next sinus beat; impulse propagates through atria (abnormal P vector), enters AV node and ventricles normally, and retrogradely depolarizes/resets the SA node.

**model_implementation**: Rhythm generator: ectopic atrial node (e.g. low RA near coronary sinus, or LA) triggered at coupling interval ~0.6-0.75 x sinus RR. Atrial activation starts from ectopic node -> different P' dipole direction (low focus = superior-directed). SA node reset: next sinus fire = arrival time of ectopic wave at SA + T_SA. AV node/bundles use refractory periods: if PAC arrives while RBB still refractory (RBB ERP > LBB ERP) -> RBB edge temporarily blocked (aberrancy); if AV node refractory -> blocked PAC.

**animation_3d**: Ectopic focus flashes at a different atrial site; atrial activation map spreads from there (different from sinus); then normal ventricular map. Shows SA node being re-set (reset ring) and the shorter-than-compensatory pause.

**test_oracle**:
- PAC P' occurs earlier than expected: PP' < 0.85 x basal PP
- P' morphology differs from sinus P (correlation < 0.9 in II or axis difference > 30 deg)
- P'R >= 120 ms
- QRS after P' correlates >= 0.95 with sinus QRS (non-aberrant config) and QRS < 120 ms
- non-compensatory: RR(pre) + RR(post) < 2 x basal RR - 40 ms
- aberrant config: QRS >= 120 ms with rsR' in V1
- blocked config: P' with no QRS within 400 ms

Sources:
- https://litfl.com/premature-atrial-complex-pac/

## Premature ventricular contraction (PVC), RV vs LV origin / 室性早搏(右室/左室起源)  `premature-ventricular-contraction`  (ventricular, P1-core)

**rate_rhythm**: Underlying sinus; premature broad QRS not preceded by a premature P. Full compensatory pause: RR spanning the PVC = 2x preceding RR (sinus not reset). Frequent if >5/min on routine ECG; 3-30 consecutive at >100 bpm = NSVT.

**intervals**: QRS >= 120 ms with abnormal morphology; no related PR.

**lead_features**: Discordant ST-T: ST depression/T inversion in leads with dominant R, ST elevation/upright T in leads with dominant S. RV origin -> LBBB-like (dominant S in V1). LV origin -> RBBB-like (dominant R in V1). Outflow-tract origin (RVOT or LVOT aortic cusp) -> inferior axis with dominant R in II, III, aVF; RVOT LBBB-like, LVOT usually RBBB-like/early transition; R-S difference index (V2R+V3R+V4R-V1S) > 20.9 favors LVOT cusp (sens 73.7%, spec 86.3%).

**mechanism**: Ectopic ventricular focus depolarizes ventricles via slow cell-to-cell myocardial conduction (Purkinje engaged late) -> wide, bizarre QRS; repolarization follows abnormal activation order (secondary discordant T). Retrograde concealment in AV junction blocks the next sinus P, producing the compensatory pause.

**model_implementation**: Rhythm generator: ectopic ventricular trigger at chosen region (RVOT, RV apex, LV lateral, LV apex) with coupling interval e.g. 0.45-0.55 x RR. Activation spreads from the region at myocardial CV; Purkinje entry delayed. Retrograde His/AV-node activation marks AV node refractory so the next sinus impulse (SA not reset) is blocked -> compensatory pause emerges naturally. Repolarization from region APD with activation-dependent timing -> discordant T emerges, no explicit T edit.

**animation_3d**: Flash at ectopic site (choose RVOT/LV), slow spreading isochrones, dyssynchronous contraction starting at focus; sinus node keeps firing - the next sinus P shown blocked at AV node (red stop).

**test_oracle**:
- PVC QRS duration >= 120 ms
- no P onset within 120-200 ms before PVC QRS onset (no premature P)
- T-wave polarity opposite to dominant QRS deflection in >= 8 of 12 leads
- RR(pre) + RR(post) = 2 x sinus RR +/- 20 ms
- RV-origin config: V1 net QRS negative (S dominant)
- LV-origin config: V1 R/S > 1
- RVOT config: net QRS positive in II, III, aVF; negative in aVL and aVR

Sources:
- https://litfl.com/premature-ventricular-complex-pvc-ecg-library/
- https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.1002926/text
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9527274

## Atrial fibrillation / 心房颤动  `atrial-fibrillation`  (supraventricular, P1-core)

**rate_rhythm**: Irregularly irregular ventricular rhythm, no P waves, disorganized atrial activity. Uncontrolled ventricular rate typically ~110-160 bpm; rapid ventricular response >100; slow AF <60; AF with WPW >200. Local atrial activation can exceed 500/min. Clinical AF episode definition >= 30 s.

**intervals**: PR undefined; QRS usually <120 ms; Ashman aberrancy (RBBB-like) after long-short RR sequence.

**lead_features**: Fibrillatory baseline best in V1/II: fine f-waves <0.5 mm (<0.05 mV), coarse f-waves >0.5 mm. QRS/T morphology identical to sinus conducted beats (unless aberrant).

**mechanism**: Multiple wavelets/rotors in atria (often triggered from pulmonary veins) -> chaotic atrial depolarization, no effective atrial contraction; AV node filters bombardment with refractoriness and concealed conduction -> irregular ventricular response.

**model_implementation**: Replace SA-driven atrial activation with stochastic multi-wavelet field: each atrial region re-activates at random intervals (350-600/min) with random propagation directions; atrial dipole = sum of incoherent small dipoles (net amplitude ~0.02-0.1 mV, parameter fine/coarse). AV node: conducts an arriving atrial impulse only if time since last conduction > AVN ERP (e.g. 300-450 ms) plus stochastic concealed-conduction jitter -> irregular RR whose mean sets ventricular rate. Ventricular graph untouched. Optional Ashman: RBB ERP proportional to preceding RR; long-short sequence -> transient RBB block.

**animation_3d**: Atria shown as flickering, chaotic color patches (no coherent wave), atrial walls quivering without contraction; AV node flashes irregularly; ventricles activate normally but at irregular intervals.

**test_oracle**:
- no repeating P wave with fixed PR before QRS (P-template correlation < 0.5)
- RR irregular: coefficient of variation of RR > 0.10 and no periodic pattern (autocorrelation of RR < 0.3 at all lags 1-10)
- mean ventricular rate within configured range (e.g. 110-160 bpm uncontrolled)
- QRS < 120 ms with morphology correlation >= 0.95 to sinus template (non-aberrant beats)
- baseline (TQ) atrial activity: fine config peak-to-peak < 0.05 mV in V1; coarse config > 0.05 mV
- dominant atrial frequency in TQ segments of V1 between 5.8 and 10 Hz (350-600/min)

Sources:
- https://litfl.com/atrial-fibrillation-ecg-library/
- https://en.wikipedia.org/wiki/Atrial_fibrillation

## Typical atrial flutter (counterclockwise, CTI-dependent) with 2:1 / 4:1 block / 典型心房扑动(逆钟向, 三尖瓣峡部依赖, 2:1/4:1)  `atrial-flutter-typical`  (supraventricular, P1-core)

**rate_rhythm**: Regular atrial activity ~300/min (range 200-400). 2:1 block -> ventricular rate ~150 bpm; 4:1 -> ~75 bpm. Ventricular rhythm regular with fixed ratio, irregular with variable block.

**intervals**: Flutter cycle length ~200 ms; QRS <120 ms; PR not applicable (F-R relationship fixed per ratio).

**lead_features**: Counterclockwise (~90% of typical flutter): inverted sawtooth flutter waves in II, III, aVF; upright flutter waves in V1 that may resemble P waves. Clockwise variant: positive flutter waves inferior, broad inverted in V1.

**mechanism**: Macro-reentry in RA around the tricuspid annulus using the cavotricuspid (IVC-tricuspid) isthmus; LA passively activated.

**model_implementation**: Reentry loop in conduction graph: ring of RA regions around tricuspid annulus (interatrial septum ascending -> RA roof -> lateral RA descending -> CTI -> septum) with loop CL 200 ms; CTI edge given slow CV so loop closes. LA driven passively via Bachmann/CS edges. Atrial dipole rotates continuously -> sawtooth (no isoelectric baseline). AV node: deterministic N:1 pass (N=2 or 4; implement as ERP between (N-1) x CL and N x CL). Clockwise option = reverse loop direction.

**animation_3d**: Wavefront circulating around the tricuspid annulus (counterclockwise in LAO view), CTI highlighted as the slow isthmus (ablation target); LA lighting passively; ventricles activated every 2nd or 4th turn.

**test_oracle**:
- atrial deflection periodicity in II and V1: 200 +/- 20 ms (~300/min)
- flutter waves net negative in II, III, aVF; net positive in V1 (CCW config)
- ventricular rate = atrial rate / N +/- 5 bpm (150 for 2:1, 75 for 4:1)
- RR regular (max-min < 40 ms) for fixed-ratio config
- QRS < 120 ms; morphology correlation >= 0.95 with sinus template
- no flat isoelectric segment >= 80 ms between flutter waves in II

Sources:
- https://litfl.com/atrial-flutter-ecg-library/

## AV nodal reentrant tachycardia (typical slow-fast SVT) / 房室结折返性心动过速(典型慢-快型)  `avnrt`  (supraventricular, P2-important)

**rate_rhythm**: Regular narrow-complex tachycardia ~140-280 bpm; 1:1 A:V. Slow-fast 80-90% of AVNRT, fast-slow ~10%, slow-slow 1-5%.

**intervals**: QRS <120 ms (unless aberrant). Typical AVNRT: short RP, retrograde P hidden in QRS or immediately after it, RP usually <70 ms (pseudo-r'/pseudo-S pattern with RP <90 ms). Atypical fast-slow: long RP (P closer to next QRS).

**lead_features**: Pseudo-r' in V1/V2 and pseudo-S in II, III, aVF (retrograde P at end of QRS, negative inferiorly). Rate-related ST depression; QRS alternans possible.

**mechanism**: Dual AV-nodal pathways: a premature beat blocks in the fast pathway (long ERP), conducts down slow pathway, returns retrogradely up fast pathway -> circus movement within the AV junction; atria and ventricles activated near-simultaneously.

**model_implementation**: AV node split into two parallel edges: slow pathway (long conduction ~250-350 ms, short ERP) and fast pathway (short conduction ~50-80 ms, long ERP). Trigger: PAC with coupling < FP ERP but > SP ERP -> antegrade SP, retrograde FP -> loop. Each loop sends impulse down His (normal ventricles) and retrogradely to atria from low septum (P' vector superior: negative in II/III/aVF), timed to arrive ~0-70 ms after QRS onset. Cycle length = SP time + FP time (+ lower common path) e.g. 330 ms (~180 bpm).

**animation_3d**: Zoomed AV-node inset with two pathways and circulating impulse; atria activated bottom-up from septum at same time ventricles activate; both chambers contract nearly simultaneously.

**test_oracle**:
- 140 <= HR <= 280 bpm; RR SD < 10 ms
- QRS < 120 ms and morphology correlation >= 0.95 vs sinus template except terminal 40 ms
- no atrial deflection in the 80-300 ms window preceding QRS onset
- retrograde P' detected with onset <= 90 ms after QRS onset (typical config) and net negative in II, III, aVF
- terminal positive deflection (pseudo-r') in V1 absent from sinus template
- 1:1 atrial:ventricular ratio

Sources:
- https://litfl.com/supraventricular-tachycardia-svt-ecg-library/
- https://www.ecgbook.com/avnrt/
- https://www.acc.org/Education-and-Meetings/Patient-Case-Quizzes/2019/04/08/06/53/April2019-ECG-of-the-Month
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11628779/
- Page RL et al. 2015 ACC/AHA/HRS Guideline for the Management of Adult Patients With Supraventricular Tachycardia. Circulation 2016;133:e506-e574

## Monomorphic ventricular tachycardia / 单形性室性心动过速  `monomorphic-vt`  (ventricular, P1-core)

**rate_rhythm**: >100 bpm (3-30 beats = non-sustained; sustained >30 s or requiring intervention). Regular. AV dissociation (independent P waves), capture and fusion beats.

**intervals**: QRS >120 ms; very broad >160 ms favors VT (examples ~200 ms). Brugada sign: QRS onset to S nadir >100 ms.

**lead_features**: Extreme ('northwest') axis -90 to 180 deg (e.g. -120 to -150); precordial concordance (all V1-V6 positive R or all negative QS); RSR' with taller left rabbit ear; Josephson sign (notch near S nadir). Uniform morphology beat-to-beat.

**mechanism**: Usually reentry around myocardial scar (e.g. post-MI) through a slow-conducting isthmus, or focal automaticity; exit site determines QRS morphology (LV exit -> RBBB-like, RV/septal exit -> LBBB-like). Sinus node continues independently.

**model_implementation**: Reentry loop in ventricular regions: define scar region (non-conducting) with border-zone isthmus edge (slow CV, e.g. 0.1-0.2 m/s) -> loop CL 300-400 ms (150-200 bpm); each cycle exits at fixed exit region and activates ventricles myocardially (Purkinje late). SA node and atria continue at sinus rate; AV node/His refractory from retrograde concealment except when a sinus impulse arrives during excitable gap -> capture (normal QRS) or fusion (blend of both activation fronts). Apical LV exit -> negative concordance.

**animation_3d**: Scar shown gray with spinning wavefront through isthmus, exit site flashing each beat; atria beating independently at slower rate (AV dissociation shown by separate atrial/ventricular clocks).

**test_oracle**:
- HR > 100 bpm (config 150-200); RR SD < 20 ms
- QRS >= 120 ms (target >= 140 ms)
- beat-to-beat QRS correlation >= 0.95 (monomorphic)
- if P waves present: PP != RR and PR SD > 40 ms (AV dissociation)
- apical-exit config: net QRS negative in all V1-V6 (negative concordance)
- northwest-exit config: frontal QRS axis between -90 and -180 deg
- capture beat (if enabled): QRS < 120 ms occurring early, correlating >= 0.9 with sinus template

Sources:
- https://litfl.com/ventricular-tachycardia-monomorphic-ecg-library/
- https://litfl.com/premature-ventricular-complex-pvc-ecg-library/

## Ventricular fibrillation / 心室颤动  `ventricular-fibrillation`  (ventricular, P1-core)

**rate_rhythm**: Chaotic irregular deflections of varying amplitude, rate 150-500/min; no identifiable P, QRS or T. Amplitude decreases with duration (coarse -> fine VF).

**intervals**: None definable.

**lead_features**: Chaotic polymorphic undulations in all leads; no isoelectric baseline; amplitude decays over minutes.

**mechanism**: Multiple wandering wavelets / spiral-wave breakup in ventricles; no coordinated contraction; zero cardiac output.

**model_implementation**: Disable His-Purkinje driving; ventricular regions activated by a stochastic multi-spiral field: each region re-excites with local cycle length 120-400 ms and random wavefront directions; H(t) = sum of many incoherent dipoles -> chaotic signal with dominant frequency 2.5-8.3 Hz. Global amplitude envelope A(t) decays from coarse to fine (time constant minutes). Atria may continue (P buried).

**animation_3d**: Ventricles mottled with rapidly changing chaotic color patches; walls quivering, no ejection; pressure/flow indicator flat.

**test_oracle**:
- QRS detector finds no regular complexes (or RR CV > 0.3 if detections occur)
- dominant frequency of lead II between 2.5 and 8.3 Hz (150-500/min)
- no isoelectric segment > 200 ms in any lead
- RMS amplitude in last 10 s < RMS in first 10 s when coarse->fine evolution enabled

Sources:
- https://litfl.com/ventricular-fibrillation-vf-ecg-library/

## Torsades de pointes (polymorphic VT with long QT) / 尖端扭转型室性心动过速  `torsades-de-pointes`  (ventricular, P2-important)

**rate_rhythm**: Polymorphic VT 150-250 bpm with QRS amplitude/axis twisting around baseline in cycles of ~5-20 beats; usually self-terminating, may degenerate to VF (rates >220 last longer and degenerate more). Pause-dependent onset: short-long-short RR sequence; R-on-T PVC initiates. Bigeminy in LQTS may herald TdP.

**intervals**: Preceding sinus beats show prolonged QT (LITFL examples QTc ~480, 540, >=600 ms); QTc >500 ms = increased TdP risk.

**lead_features**: Spindle-shaped QRS envelope with polarity reversal in a given lead; broad QRS >=120 ms; irregular RR during run.

**mechanism**: Long QT -> early afterdepolarizations (EADs) and increased dispersion of repolarization; EAD-triggered beat on T wave starts reentry that meanders, rotating the activation axis.

**model_implementation**: Pre-condition: prolong ventricular APD (esp. mid-myocardial/endocardial regions) to QTc > 500 ms with large regional APD dispersion. Trigger: after a long RR, emit ectopic beat from longest-APD region with coupling ~ peak/end of preceding T (R on T). Run: meandering rotor whose exit region rotates around the ventricle with period 5-20 beats -> H(t) direction rotates slowly through 180 deg -> QRS amplitude waxes/wanes and flips in each lead. CL 240-400 ms. Self-terminate after N beats or hand off to VF model.

**animation_3d**: APD heat map before onset showing long plateau and dispersion; trigger flash at R-on-T; activation wave meandering with its exit point visibly circling the ventricle; mechanical quivering.

**test_oracle**:
- QTc of sinus beats before onset > 500 ms
- initiating RR sequence: RR(n-1) short, RR(n) long (> 1.2 x RR(n-1)), then premature beat with onset before end of preceding T (R on T)
- during run: 150 <= rate <= 250 bpm; QRS >= 120 ms
- QRS peak amplitude envelope in II modulates with period 5-20 beats and net QRS polarity reverses at least once per period
- beat-to-beat QRS correlation < 0.8 (polymorphic)

Sources:
- https://litfl.com/polymorphic-vt-and-torsades-de-pointes-tdp/
- https://emedicine.com/emerg/topic596.htm
- https://litfl.com/qt-interval-ecg-library/

## Junctional escape rhythm (and accelerated junctional / ventricular escape) / 交界性逸搏心律(含加速性交界性心律/室性逸搏)  `junctional-escape-rhythm`  (supraventricular, P2-important)

**rate_rhythm**: Junctional bradycardia <40; junctional escape 40-60; accelerated junctional 60-100; junctional tachycardia >100 bpm. Regular. Ventricular escape pacemaker 20-40 bpm. No relationship to preceding atrial activity (sinus arrest/slowing or AV block).

**intervals**: QRS typically narrow <120 ms (ventricular escape: wide). Retrograde P' may precede QRS with short P'R <120 ms, be hidden in QRS, or follow it.

**lead_features**: QRS identical to sinus-conducted beats; retrograde P' inverted in II, III, aVF and upright in aVR when visible.

**mechanism**: AV-junction/His automaticity takes over when SA node fails or impulses are blocked; ventricles activated normally via His-Purkinje; atria activated retrogradely from the low septum.

**model_implementation**: Rhythm generator: suppress SA (arrest) or slow below junctional rate; His/AV-junction node as pacemaker with intrinsic period 1.0-1.5 s (40-60 bpm; accelerated 0.6-1.0 s). Antegrade edge to His (normal ventricular map). Retrograde edge to atria from low septal region with delay chosen to put P' before (delay < antegrade), within, or after QRS. Ventricular-escape variant: pacemaker in a ventricular region, period 1.5-3 s, myocardial spread.

**animation_3d**: AV junction glows as the pacemaker; atrial map spreads bottom-to-top (retrograde) while ventricles fire normally; SA node dark.

**test_oracle**:
- 40 <= HR <= 60 bpm (escape config); RR regular (max-min < 80 ms)
- QRS < 120 ms and correlation >= 0.95 with sinus QRS template
- either no P wave, or P' net negative in II, III, aVF with P'R < 120 ms, or P' after QRS onset
- ventricular-escape config: 20 <= HR <= 40 and QRS >= 120 ms

Sources:
- https://litfl.com/junctional-escape-rhythm-ecg-library/
- https://litfl.com/pr-interval-ecg-library/

## First-degree AV block / 一度房室传导阻滞  `first-degree-av-block`  (av-conduction, P1-core)

**rate_rhythm**: Sinus rhythm, 1:1 conduction.

**intervals**: PR >200 ms (5 small squares), constant. 'Marked' if PR >300 ms (P may be buried in preceding T). QRS normal.

**lead_features**: Normal P, QRS, T morphology; long isoelectric PR segment.

**mechanism**: Slowed conduction, usually within the AV node (vagal tone, drugs, ischemia, degeneration).

**model_implementation**: Increase AV-node edge delay (e.g. +100 ms for PR ~260 ms; +180 ms for marked). Constant delay (no decrement needed). All else unchanged.

**animation_3d**: AV node pulse lingers visibly longer (slow-motion glow) between atrial and ventricular activation; longer gap between atrial and ventricular contraction.

**test_oracle**:
- PR > 200 ms on every beat; PR SD < 10 ms
- P:QRS = 1:1
- QRS duration and axis within +/- 5 ms / 10 deg of NSR config
- marked config: PR > 300 ms

Sources:
- https://litfl.com/first-degree-heart-block-ecg-library/
- https://litfl.com/pr-interval-ecg-library/

## Second-degree AV block Mobitz I (Wenckebach) / 二度I型房室传导阻滞(文氏)  `mobitz-i-wenckebach`  (av-conduction, P1-core)

**rate_rhythm**: Constant P-P; progressive PR prolongation culminating in a non-conducted P; groups with P:QRS 3:2, 4:3, 5:4; RR progressively shortens within a group; PR shortest after the dropped beat.

**intervals**: PR longest immediately before dropped beat, shortest immediately after; greatest PR increment between 1st and 2nd beats of the cycle. QRS usually narrow.

**lead_features**: Normal P/QRS/T morphology; grouped beating.

**mechanism**: Decremental conduction in the AV node (usually reversible): each successive impulse arrives earlier in the node's recovery period and conducts more slowly until it fails.

**model_implementation**: AV-node edge with recovery-dependent delay: AH = AH_min + A x exp(-R/tau), R = time since last AV-node exit (recovery time), plus ERP. As R shortens each beat AH increases by decreasing increments until the P arrives within ERP -> block -> full recovery. Tune (AH_min, A, tau, ERP) to the selected ratio (e.g. 4:3). Block site = AV node (narrow QRS).

**animation_3d**: AV node glow lengthens beat by beat (color bar filling), then one atrial impulse stops at the node (red X) and ventricles skip; cycle restarts.

**test_oracle**:
- PP constant (SD < 20 ms)
- within each group PR(n+1) > PR(n)
- largest PR increment occurs between beat 1 and beat 2 of the group
- exactly one P per group with no QRS within 600 ms after it
- PR after dropped beat equals min PR of the group (+/- 10 ms)
- RR intervals shorten within each group
- RR containing the dropped beat < 2 x PP
- P:QRS ratio equals configured value (e.g. 4:3); QRS < 120 ms

Sources:
- https://litfl.com/av-block-2nd-degree-mobitz-i-wenckebach-phenomenon/

## Second-degree AV block Mobitz II / 二度II型房室传导阻滞  `mobitz-ii`  (av-conduction, P1-core)

**rate_rhythm**: Intermittent non-conducted P waves without progressive PR prolongation; may be fixed ratio (2:1, 3:1). RR surrounding the dropped beat is an exact multiple of preceding RR (2x for one dropped beat).

**intervals**: PR constant in conducted beats. ~75% of cases block distal to His -> broad QRS; ~25% intra-His -> narrow QRS. Often pre-existing LBBB or bifascicular block.

**lead_features**: Conducted QRS frequently shows BBB/bifascicular pattern (e.g. RBBB + LAFB).

**mechanism**: All-or-none failure in His-Purkinje system (infra-nodal); high risk of progression to complete block.

**model_implementation**: AV-node delay constant. His -> bundle edge (or both bundle edges, i.e. bilateral block) fails all-or-none on selected beats (deterministic ratio or probability). Recommended teaching config: background RBB block + LAF block (wide QRS, LAD) with intermittent block of LPF/remaining conduction.

**animation_3d**: Impulse passes AV node normally, then stops below the His bundle (highlight infra-Hisian level); ventricles skip; no progressive AV-node glow lengthening.

**test_oracle**:
- PR of conducted beats constant (max-min <= 10 ms)
- at least one P with no following QRS
- RR spanning the dropped beat = 2 x PP +/- 20 ms
- PR immediately after dropped beat equals PR before it (+/- 10 ms)
- infra-His config: conducted QRS >= 120 ms

Sources:
- https://litfl.com/av-block-2nd-degree-mobitz-ii-hay-block/

## Third-degree (complete) AV block with junctional vs ventricular escape / 三度(完全性)房室传导阻滞(交界性/室性逸搏)  `complete-heart-block`  (av-conduction, P1-core)

**rate_rhythm**: Complete AV dissociation: no atrial impulses conducted; atrial rate > ventricular rate, both regular and independent (LITFL examples: atria 85/ventricles 38; 60/27; 100/15; 85/42 bpm). Junctional escape 40-60 bpm; ventricular escape 20-40 bpm.

**intervals**: PR varies randomly; junctional escape QRS narrow (<120 ms); ventricular escape QRS wide.

**lead_features**: P waves march through QRS/T at all phases; QRS morphology of escape focus (junctional = sinus-like; ventricular = bizarre, discordant T).

**mechanism**: Block at AV node (often atropine-responsive, junctional escape) or His-Purkinje (typically unresponsive, ventricular escape).

**model_implementation**: Block AV-node edge (nodal) or His->bundle edges (infra-Hisian) for all impulses. Add independent escape pacemaker: His/junction node period 1.0-1.5 s (narrow QRS via normal ventricular graph) or ventricular region (e.g. RV/LV apex) period 1.5-3.0 s with myocardial spread (wide QRS). SA rhythm unchanged.

**animation_3d**: Atria pacing at sinus rate; AV node grayed/blocked; escape site glowing (junction or ventricle) and ventricles contracting at their own slower beat; two independent metronomes displayed.

**test_oracle**:
- PP regular and RR regular, atrial rate > ventricular rate
- PR intervals not constant (SD > 40 ms); P waves found inside QRS/T windows
- junctional config: 40 <= HR <= 60 and QRS < 120 ms
- ventricular config: 20 <= HR <= 40 and QRS >= 120 ms
- no QRS-locked P (cross-correlation of P times to QRS times shows no fixed lag)

Sources:
- https://litfl.com/av-block-3rd-degree-complete-heart-block/
- https://litfl.com/junctional-escape-rhythm-ecg-library/

## Right bundle branch block / 右束支传导阻滞  `rbbb`  (intraventricular-conduction, P1-core)

**rate_rhythm**: Sinus, 1:1 (any underlying rhythm).

**intervals**: Complete RBBB: QRS >= 120 ms in adults (>100 ms age 4-16, >90 ms <4 y). Incomplete RBBB: QRS 110-120 ms (AHA/ecgpedia; some sources 100-120 ms). R-peak time V1 >50 ms, normal in V5-V6.

**lead_features**: rsr', rsR' or rSR' in V1 or V2 (M-shaped, R' > R); wide slurred S in I, aVL, V5-V6 (S longer than R or >40 ms in I and V6); secondary ST depression/T inversion in V1-V3 (appropriate discordance). Axis usually normal.

**mechanism**: RBB conduction fails; septum (left->right) and LV activate normally; RV is activated late by slow trans-septal myocardial spread -> late rightward-anterior forces (R' in V1, terminal S in I/V6). RV repolarizes late -> secondary T changes.

**model_implementation**: Block the RBB edge. RV regions get activation from adjacent septal/LV regions via myocardial edges (CV ~0.3-0.5 m/s) -> RV activation delayed ~40-60 ms; late RV dipole points rightward-anterior (-x, +z). Septal first-activation (left->right) unchanged so r in V1 and septal q in V6 persist. Repolarization follows activation (APD unchanged) -> secondary T inversion V1-V3 emerges. Incomplete RBBB: slow (not block) RBB edge.

**animation_3d**: Right bundle shown cut; LV and septum light first, a wave crosses the septum to the RV late; RV contraction visibly delayed vs LV.

**test_oracle**:
- QRS >= 120 ms (complete) / 110-120 ms (incomplete config)
- V1 or V2 has two positive peaks (r then R') with R' amplitude > r amplitude
- S-wave duration > 40 ms (or > R duration) in I and V6
- R-peak time V1 > 50 ms; R-peak time V6 < 45 ms
- T net negative in V1 (secondary)
- frontal QRS axis within -30 to +90 deg (isolated RBBB)
- septal q present in V6 (initial negative deflection < 40 ms)

Sources:
- https://en.ecgpedia.org/wiki/LPFB
- https://en.wikipedia.org/wiki/Right_bundle_branch_block
- https://litfl.com/right-bundle-branch-block-rbbb-ecg-library/
- Surawicz B et al. AHA/ACCF/HRS Recommendations Part III: Intraventricular Conduction Disturbances. Circulation 2009;119:e235-e240

## Left bundle branch block / 左束支传导阻滞  `lbbb`  (intraventricular-conduction, P1-core)

**rate_rhythm**: Sinus, 1:1 (any underlying rhythm).

**intervals**: QRS >= 120 ms; R-peak time >60 ms in V5-V6 (normal in V1-V3).

**lead_features**: Dominant S in V1 (QS or rS); broad, notched/slurred monophasic R in I, aVL, V5-V6; absent septal q in lateral leads; appropriate discordance (ST-T opposite to terminal QRS; allowable discordant ST elevation <25% of preceding S depth); LAD and poor R-wave progression common. Sgarbossa concordance has ~90% specificity, 36% sensitivity for AMI; BARCELONA: concordant ST deviation >=1 mm in any lead.

**mechanism**: LBB conduction fails: septum activates right->left from RBB (loss of normal septal vector), LV activated slowly via myocardium from septum to lateral/posterolateral wall -> broad leftward QRS; repolarization follows abnormal sequence (discordant ST-T).

**model_implementation**: Block the LBB edge (both fascicles). Septal activation starts on RV side and moves leftward (+x) -> no q in I/V6, no r (or tiny r) in V1. LV free-wall regions activated by myocardial edges from septum (CV ~0.3-0.5 m/s) -> total QRS 140-160 ms with late posterolateral dipole (leftward-posterior). APD unchanged; T discordance emerges from reversed activation order.

**animation_3d**: Left bundle shown cut; RV and septum light first, slow wave sweeps across LV to lateral wall; dyssynchrony: early septal 'flash' then late lateral wall contraction.

**test_oracle**:
- QRS >= 120 ms (target 140-160 ms)
- V1 net QRS negative (QS or rS with r < 0.1 mV)
- I, aVL, V5, V6 net QRS positive with no initial negative deflection >= 0.05 mV (no septal q)
- R-peak time in V5 or V6 > 60 ms
- ST-T discordant: ST(J+60) and T positive in V1-V3, negative in I, aVL, V6
- in V1-V3 discordant ST elevation < 0.25 x |S| amplitude

Sources:
- https://litfl.com/left-bundle-branch-block-lbbb-ecg-library/
- https://en.wikipedia.org/wiki/Left_bundle_branch_block
- https://en.ecgpedia.org/wiki/LPFB
- Surawicz B et al. Circulation 2009;119:e235-e240

## Left anterior fascicular block / 左前分支阻滞  `lafb`  (intraventricular-conduction, P2-important)

**rate_rhythm**: Sinus, 1:1.

**intervals**: QRS <120 ms (normal or slightly prolonged 80-110 ms); R-peak time in aVL >= 45 ms.

**lead_features**: Left axis deviation -45 to -90 deg; qR in I and aVL; rS in II, III, aVF; increased limb-lead voltage (R aVL may exceed 11 mm = 1.1 mV, mimicking LVH).

**mechanism**: Block of the anterior-superior fascicle: LV activation begins inferoposteriorly via LPF (initial vector inferior-rightward), then spreads superiorly/leftward to the anterolateral wall -> dominant late superior-leftward vector.

**model_implementation**: Block LAF edge. Anterosuperior LV regions activated from LPF territory through myocardium (+10-20 ms). Initial dipole inferior-rightward (+y,-x small), late dominant dipole superior-leftward (frontal ~-60 deg).

**animation_3d**: Anterior fascicle shown cut; inferior/posterior LV wall lights first, wave travels up to anterior-superior wall (arrow pointing up-left).

**test_oracle**:
- frontal QRS axis between -45 and -90 deg
- I and aVL: initial q (< 40 ms) followed by dominant R (qR)
- II, III, aVF: initial r followed by deeper S (rS), net negative
- R-peak time aVL >= 45 ms
- QRS < 120 ms

Sources:
- https://litfl.com/left-anterior-fascicular-block-lafb-ecg-library/
- https://en.ecgpedia.org/wiki/LPFB
- Surawicz B et al. Circulation 2009;119:e235-e240

## Left posterior fascicular block / 左后分支阻滞  `lpfb`  (intraventricular-conduction, P2-important)

**rate_rhythm**: Sinus, 1:1.

**intervals**: QRS <120 ms (80-110 ms); R-peak time in aVF >45 ms.

**lead_features**: Right axis deviation (+90 to +180 deg in adults); rS in I and aVL; qR in II, III, aVF; increased limb voltage. Diagnosis requires excluding RVH, lateral MI, PE and other causes of RAD.

**mechanism**: Block of the posterior-inferior fascicle: activation begins in anterosuperior LV (initial superior-leftward vector), then spreads to inferoposterior wall -> dominant late inferior-rightward vector.

**model_implementation**: Block LPF edge. Inferoposterior LV regions activated late via myocardium from LAF territory. Initial dipole superior-leftward, dominant late dipole inferior-rightward (frontal ~+110..+120 deg).

**animation_3d**: Posterior fascicle cut; anterior-superior LV lights first, wave descends to inferior-posterior wall.

**test_oracle**:
- frontal QRS axis between +90 and +180 deg
- I and aVL: rS (net negative)
- III and aVF: qR (initial q < 40 ms then dominant R)
- R-peak time aVF > 45 ms
- QRS < 120 ms

Sources:
- https://litfl.com/left-posterior-fascicular-block-lpfb-ecg-library/
- https://en.ecgpedia.org/wiki/LPFB
- Surawicz B et al. Circulation 2009;119:e235-e240

## Wolff-Parkinson-White pre-excitation (left-lateral accessory pathway) / 预激综合征(WPW, 左侧游离壁旁道)  `wpw-left-lateral`  (pre-excitation, P1-core)

**rate_rhythm**: Sinus, 1:1 (substrate for orthodromic AVRT and for pre-excited AF >200 bpm).

**intervals**: PR <120 ms; QRS >110 ms; delta wave (slurred slow initial QRS upstroke).

**lead_features**: Discordant secondary ST-T. Type A (left-sided AP): positive delta in all precordial leads, R/S >1 in V1. Type B (right-sided): negative delta in V1-V2. Pseudo-infarct pattern in up to 70% (negative delta = pseudo-Q in inferior/anterior leads, or tall R V1-V3). Left-lateral AP: delta negative/isoelectric in I and/or aVL.

**mechanism**: Accessory AV connection bypasses AV-node delay: lateral LV base is pre-excited and activated slowly cell-to-cell (delta wave); the normally conducted wave via His-Purkinje then fuses with it.

**model_implementation**: Add accessory edge LA-lateral mitral-annulus region -> LV basal-lateral region, non-decremental, short delay (~ myocardial). LV lateral base activates early and spreads at myocardial CV (delta dipole directed from lateral base toward septum/right-anterior: -x, +z) while AV-node path is unchanged; final QRS = fusion. P-to-J interval stays ~normal. Degree of pre-excitation adjustable via AV-node delay. Repolarization follows activation -> discordant ST-T emerges.

**animation_3d**: Extra muscle bridge on the left lateral mitral annulus glowing; ventricular activation starts at lateral LV base before His fires, then normal Purkinje wave joins; option to show orthodromic AVRT loop.

**test_oracle**:
- PR (P onset -> QRS onset) < 120 ms
- QRS >= 110 ms
- initial 40 ms QRS slope in V4-V6 < 50% of NSR template slope (slurred delta)
- V1 R/S > 1
- initial 40 ms (delta) net negative or isoelectric in I or aVL
- delta net positive in V1-V6
- T polarity opposite to dominant QRS in >= 6 leads

Sources:
- https://litfl.com/pre-excitation-syndromes-ecg-library/
- https://litfl.com/pr-interval-ecg-library/
- https://litfl.com/atrial-fibrillation-ecg-library/
- Arruda MS et al. Development and validation of an ECG algorithm for identifying accessory pathway ablation site in WPW syndrome. J Cardiovasc Electrophysiol 1998;9:2-12 (reference only, not retrieved)

## Anterior STEMI (LAD occlusion) / 前壁ST段抬高型心肌梗死(前降支)  `anterior-stemi-lad`  (ischemia-infarction, P1-core)

**rate_rhythm**: Usually sinus (tachycardia possible); risk of VT/VF.

**intervals**: PR/QRS normal acutely; QRS may lengthen slightly; Q waves develop later.

**lead_features**: New J-point ST elevation in >=2 contiguous leads: V2-V3 >= 2 mm (0.2 mV) men >=40 y, >= 2.5 mm men <40 y, >= 1.5 mm women; >= 1 mm (0.1 mV) in other leads. Territory: septal V1-V2, anterior V3-V4, anteroseptal V1-V4, anterolateral V3-V6 + I + aVL, extensive V1-V6 + I + aVL. Reciprocal ST depression in III and aVF. Hyperacute T waves first, most marked V2-V3. Proximal LAD: STE aVR (43% sens/95% spec for proximal to S1), STE V1 >2.5 mm, STE + Q in I/aVL (proximal to D1). Q waves V1-V6 later.

**mechanism**: LAD occlusion -> transmural ischemia of anterior wall/anterior septum/apex. Injured cells depolarize partially and shorten APD -> systolic current of injury flowing toward the injured epicardium -> ST vector points toward the anterior territory.

**model_implementation**: Mark LAD territory regions (AHA segments 1,2,7,8,13,14,17; septal/anterior/apical) ischemic. Add constant injury vector V_inj during plateau (QRS end -> T end, tapering into T) pointing from LV centroid to territory centroid: anterior-leftward-inferior/apical, approx (x,y,z) = (+0.3,+0.2,+0.9) normalized; magnitude so V2-V3 ST = 0.2-0.4 mV. Proximal LAD variant: add superior-leftward component (toward aVL) and septal-basal component -> STE I/aVL, STD III/aVF by projection. Phases: (1) hyperacute: shorten ischemic APD + raise repolarization amplitude (tall broad T); (2) STE via V_inj; (3) necrosis: set ischemic regions' depolarization weight -> 0 (Q/QS, loss of R); (4) T inversion: reverse local transmural APD gradient.

**animation_3d**: Coronary tree with LAD occlusion marker; anterior wall/apex colored ischemic red; wall hypokinesis/akinesis of anterior segments; injury vector arrow drawn from heart center toward anterior wall projected on each lead axis.

**test_oracle**:
- ST(J) >= 0.2 mV in V2 and V3 (male >=40 config; 0.15 mV female, 0.25 mV male <40)
- ST(J) >= 0.1 mV in V4 (anterior config) and V1 (anteroseptal config)
- ST(J) in III or aVF <= -0.05 mV (reciprocal; proximal config)
- proximal config: ST(J) >= 0.1 mV in I and aVL
- inferior leads II, III, aVF ST(J) < 0.1 mV (non-wraparound config)
- hyperacute phase: T amplitude V2-V3 >= 1.5 x NSR value with ST(J) < 0.1 mV
- necrosis phase: QS or Q >= 20 ms in V2 and V3

Sources:
- https://litfl.com/anterior-myocardial-infarction-ecg-library/
- https://foamed.ebmedicine.net/rapid-reference/stemi-ecg/
- https://emra.org/emresident/article/ecg-challenge-oct-nov-2021
- https://www.wikem.org/wiki/STEMI
- Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237-269; Circulation 2018;138:e618-e651
- Wagner GS et al. AHA/ACCF/HRS Recommendations Part VI: Acute Ischemia/Infarction. Circulation 2009;119:e262-e270 (not retrieved)

## Inferior STEMI (RCA; LCx variant) / 下壁ST段抬高型心肌梗死(右冠/回旋支)  `inferior-stemi-rca`  (ischemia-infarction, P1-core)

**rate_rhythm**: Sinus; bradycardia and 2nd/3rd-degree AV block in ~20% (stepwise in 50%, abrupt in 50%).

**intervals**: PR may lengthen (AV-nodal ischemia); QRS normal.

**lead_features**: ST elevation II, III, aVF (>= 0.1 mV in >=2); reciprocal ST depression aVL (present in 91% of subtle inferior OMIs). RCA (80%): STE III > II, reciprocal STD in I, RV involvement (40%) with STE V1 and V4R. LCx (18%): STE II = III, no STD in I, lateral STE I, aVL, V5-V6. Posterior extension -> STD V1-V3.

**mechanism**: Occlusion of RCA (or dominant LCx) -> transmural ischemia of inferior wall/inferior septum (+/- RV, posterior wall); RCA usually also supplies AV node.

**model_implementation**: Ischemic regions: AHA segments 3,4,9,10,15 (+ RV free wall for proximal RCA; + inferolateral 5,11 for LCx). Injury vector: RCA frontal angle ~+110..+120 deg (toward III), z ~0 or slightly anterior with RV involvement; LCx ~+70..+90 deg with leftward-posterior component. Reciprocal aVL/I depression arises by projection. Optional: AV-node ischemia -> increase AV delay/decremental block (1st degree, Wenckebach, CHB).

**animation_3d**: RCA occlusion marker; inferior wall (+/- RV) colored ischemic; camera tilt to show diaphragmatic surface; optional AV node dimming with conduction block.

**test_oracle**:
- ST(J) >= 0.1 mV in II, III and aVF
- ST(J) in aVL <= -0.05 mV
- RCA config: ST(III) > ST(II) and ST(J) in I < 0
- RV-involvement config: ST(J) in V1 >= 0 and, if V4R electrode simulated, ST(V4R) >= 0.1 mV
- LCx config: ST(II) >= ST(III) and ST(J) in I >= 0
- precordial V2-V4 ST(J) < 0.1 mV (no anterior involvement)

Sources:
- https://litfl.com/inferior-stemi-ecg-library/
- https://foamed.ebmedicine.net/rapid-reference/stemi-ecg/
- https://open-exam-prep.com/study-guides/uk-mrcp-part1/cardiology-cad-heart-failure/acute-coronary-syndromes
- Thygesen K et al. Eur Heart J 2019;40:237-269

## Lateral / high-lateral STEMI (LCx-OM or diagonal) / 侧壁/高侧壁ST段抬高型心肌梗死(回旋支钝缘支或对角支)  `lateral-stemi`  (ischemia-infarction, P1-core)

**rate_rhythm**: Sinus.

**intervals**: Normal acutely.

**lead_features**: ST elevation in I, aVL, V5-V6 (>= 0.1 mV in >=2 contiguous); high lateral = mainly I and aVL. Reciprocal STD in III and aVF. Precordial + I/aVL STE predicts proximal LAD lesion 87% of the time. Culprits: D1 (LAD), OM (LCx), ramus intermedius.

**mechanism**: Transmural ischemia of the lateral LV wall; current of injury directed leftward-superior.

**model_implementation**: Ischemic regions: AHA anterolateral/inferolateral segments 5,6,11,12,16 (high lateral: basal/mid anterolateral 6,12). Injury vector leftward-superior, frontal ~-20..-40 deg; z ~0 for V5-V6 involvement, slightly anterior for D1 (adds V2 elevation: 'South African flag' I, aVL, V2 up / III down). Reciprocal inferior depression by projection.

**animation_3d**: Diagonal or OM occlusion marker; lateral wall colored ischemic; view rotated to left lateral.

**test_oracle**:
- ST(J) >= 0.1 mV in I and aVL
- full-lateral config: ST(J) >= 0.1 mV in V5 and V6
- ST(J) in III <= -0.05 mV and ST(J) in aVF < 0
- ST(J) in V1-V3 < 0.1 mV (OM config)
- D1 config: ST(J) in V2 >= 0.1 mV while ST(III) < 0

Sources:
- https://litfl.com/lateral-stemi-ecg-library/
- https://foamed.ebmedicine.net/rapid-reference/stemi-ecg/
- Thygesen K et al. Eur Heart J 2019;40:237-269

## Posterior MI (posterior STEMI) / 后壁心肌梗死  `posterior-mi`  (ischemia-infarction, P2-important)

**rate_rhythm**: Sinus.

**intervals**: Normal.

**lead_features**: Horizontal ST depression V1-V3; tall broad R (>30 ms) and R/S >1 in V2; upright T in V1-V3. Posterior leads V7 (left posterior axillary line), V8 (tip of left scapula), V9 (left paraspinal), all in the horizontal plane of V6: ST elevation >= 0.5 mm (0.05 mV) confirms. Accompanies 15-20% of STEMIs (usually inferior or lateral); isolated 5-10%. Old posterior MI (UDMI): R >= 0.04 s in V1-V2 with R/S >1 and concordant positive T.

**mechanism**: Injury of the posterobasal LV (RCA or LCx territory); injury vector points posteriorly, i.e. away from V1-V3 -> mirror-image ST depression anteriorly.

**model_implementation**: Ischemic regions: basal/mid inferolateral-posterior segments (4,5,10,11). Injury vector directed posteriorly (-z) with slight inferior/leftward component. Compute extra electrodes V7-V9 on the posterior thorax (same plane as V6) from the same H(t). Evolved/old: set posterior regions' depolarization weight -> 0 -> unopposed anterior forces -> tall broad R in V1-V2.

**animation_3d**: Heart rotated to show posterior wall colored ischemic; posterior electrodes V7-V9 shown on the back; mirror-image explanation (flip V1-V3 trace vertically).

**test_oracle**:
- ST(J) <= -0.05 mV in >=2 of V1, V2, V3 with flat/horizontal ST (|ST(J+80)-ST(J)| < 0.05 mV)
- T net positive in V1-V3
- ST(J) >= 0.05 mV in V7, V8 and V9
- evolved config: R/S > 1 in V2 and R duration in V1 >= 40 ms

Sources:
- https://litfl.com/posterior-myocardial-infarction-ecg-library/
- https://en.ecgpedia.org/wiki/Q_wave
- https://open-exam-prep.com/study-guides/uk-mrcp-part1/cardiology-cad-heart-failure/acute-coronary-syndromes
- Thygesen K et al. Eur Heart J 2019;40:237-269

## Subendocardial ischemia / NSTEMI (ST depression) / 心内膜下缺血/非ST段抬高型心肌梗死(ST段压低)  `subendocardial-ischemia-nstemi`  (ischemia-infarction, P2-important)

**rate_rhythm**: Sinus (often tachycardic).

**intervals**: Normal.

**lead_features**: Horizontal or downsloping ST depression >= 0.5 mm (0.05 mV) at J point in >=2 contiguous leads; >= 1 mm more specific; >= 2 mm in >=3 leads = high risk (35% 30-day mortality quoted). Upsloping depression non-specific. Widespread STD + STE in aVR >1 mm suggests left main/multivessel ischemia. T inversion >= 1 mm in >=2 contiguous leads with R/S >1 (dynamic). ST depression does not localize. Wellens (critical LAD): biphasic (type A, 25%) or deep symmetric inverted (type B, 75%) T in V2-V4.

**mechanism**: Supply-demand ischemia confined to the inner myocardial layer; current of injury directed from epicardium toward the endocardium/ventricular cavity -> ST depression in leads facing the LV, ST elevation in aVR (which faces the cavity).

**model_implementation**: Mark subendocardial layer of many LV regions (circumferential) ischemic. Additive injury vector = sum of local vectors pointing from each region toward the LV cavity -> net vector toward base/right/superior (frontal ~-150 deg toward aVR, slight posterior), magnitude 0.1-0.2 mV. Optional: shorten subendocardial APD less than epicardial (preserve T) or invert T in V2-V4 for Wellens by local transmural APD reversal. No change to depolarization.

**animation_3d**: Short-axis cut showing inner LV ring (subendocardium) glowing ischemic around the whole circumference; no single coronary occlusion (or left-main lesion marker for aVR variant); mild global hypokinesis.

**test_oracle**:
- ST(J) <= -0.05 mV with ST slope J->J+80 <= 0 (horizontal/downsloping) in >=2 contiguous leads among I, II, aVF, V4-V6
- ST(J) in aVR >= +0.1 mV (left-main config)
- no lead other than aVR and V1 with ST(J) >= +0.1 mV
- QRS duration and morphology unchanged vs NSR (correlation >= 0.95)
- Wellens config: T net negative or biphasic (+/-) in V2-V4 with |ST(J)| < 0.1 mV

Sources:
- https://litfl.com/myocardial-ischaemia-ecg-library/
- https://litfl.com/st-segment-ecg-library/
- https://litfl.com/t-wave-ecg-library/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6653334
- Thygesen K et al. Eur Heart J 2019;40:237-269

## Old (prior) myocardial infarction with pathological Q waves / 陈旧性心肌梗死(病理性Q波)  `old-mi-q-waves`  (ischemia-infarction, P2-important)

**rate_rhythm**: Sinus.

**intervals**: QRS usually <120 ms.

**lead_features**: Universal Definition criteria for prior MI (no LVH/LBBB): any Q wave in V2-V3 >= 0.02 s or QS in V2 and V3; Q >= 0.03 s and >= 0.1 mV deep or QS in I, II, aVL, aVF or V4-V6 in any two leads of a contiguous grouping (I, aVL, V6; V4-V6; II, III, aVF); R >= 0.04 s in V1-V2 with R/S >1 and concordant positive T (posterior). Same criteria for V7-V9. Persistent T inversion possible; persistent STE suggests aneurysm.

**mechanism**: Necrotic/scarred myocardium is electrically silent; the loss of its depolarization forces leaves the initial QRS vector pointing away from the overlying leads -> Q or QS ('electrical window').

**model_implementation**: Set scar regions' depolarization (and repolarization) weight to 0 and make them non-conducting (activation routed around). No acute injury vector. Old inferior MI: scar in inferior segments; old anterior MI: anteroseptal/apical segments. Optional residual T inversion from altered border-zone APD.

**animation_3d**: Scar region rendered gray/thin, no activation color, akinetic during contraction; vector diagram shows missing arrows from the scar.

**test_oracle**:
- old inferior config: Q duration >= 30 ms and depth >= 0.1 mV in >=2 of II, III, aVF
- old anterior config: QS or Q >= 20 ms in V2 and V3
- |ST(J)| < 0.1 mV in affected leads (no acute injury)
- QRS duration < 120 ms

Sources:
- https://en.ecgpedia.org/wiki/Q_wave
- https://www.springermedicine.com/electrocardiography/myocardial-infarction/myocardial-infarction-assessment-by-surface-electrocardiography/22117026
- Thygesen K et al. Eur Heart J 2019;40:237-269

## Left ventricular hypertrophy (voltage + strain) / 左心室肥厚(电压标准与劳损型)  `lvh`  (hypertrophy, P1-core)

**rate_rhythm**: Sinus.

**intervals**: QRS normal or mildly prolonged (<120 ms); R-peak time V5-V6 >50 ms.

**lead_features**: Sokolow-Lyon SV1 + RV5 (or V6) >= 35 mm (3.5 mV); R aVL >11 mm (1.1 mV); Cornell RaVL + SV3 >28 mm men, >20 mm women; Peguero-Lo Presti SD (deepest S any lead) + SV4 >= 28 mm men, >= 23 mm women; Cornell product (RaVL+SV3 [+8 mm women]) x QRS duration >2440 mm.ms. Strain: ST depression and asymmetric T inversion in V5-V6, I, aVL. Supportive: LAE, LAD. High specificity, low sensitivity.

**mechanism**: Increased LV mass increases depolarization forces directed leftward-posterior; longer transmural activation; altered repolarization (relative subendocardial ischemia/reversed gradient) gives secondary ST-T opposite to QRS.

**model_implementation**: Scale LV free-wall and septal region dipole weights x1.5-2.0 (wall thickness), lengthen transmural activation time +10-20 ms. Strain variant: reverse transmural APD gradient in lateral LV regions (endocardium repolarizes earlier) so T vector opposes QRS, plus small ST vector opposite to QRS axis. Optional LAE: prolong LA activation (P >= 120 ms, bifid in II, V1 terminal negative > 40 ms and > 0.1 mV).

**animation_3d**: Thickened LV wall in cross-section; larger activation arrows; strain shown as repolarization heat map with endocardium finishing first in lateral wall.

**test_oracle**:
- SV1 + max(RV5, RV6) >= 3.5 mV
- RaVL + SV3 > 2.8 mV (male config) / > 2.0 mV (female config)
- R-peak time V6 > 50 ms; QRS < 120 ms
- strain config: ST(J) <= -0.05 mV and T net negative in V5, V6, I, aVL
- T in V5-V6 asymmetric: descending limb duration > 1.3 x ascending limb

Sources:
- https://litfl.com/left-ventricular-hypertrophy-lvh-ecg-library/
- https://litfl.com/p-wave-ecg-library/
- Hancock EW et al. AHA/ACCF/HRS Recommendations Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261 (not retrieved)

## Right ventricular hypertrophy / 右心室肥厚  `rvh`  (hypertrophy, P2-important)

**rate_rhythm**: Sinus.

**intervals**: QRS <120 ms.

**lead_features**: Right axis deviation >= +110 deg; dominant R in V1 (>7 mm = 0.7 mV or R/S >1); dominant S in V5 or V6 (>7 mm or R/S <1). RV strain: ST depression/T inversion V1-V4 and II, III, aVF. P pulmonale: P in II >2.5 mm (0.25 mV).

**mechanism**: Increased RV mass shifts the net QRS vector rightward and anterior; RV pressure overload alters RV repolarization; RA enlargement increases RA P forces.

**model_implementation**: Scale RV free-wall dipole weights x2-3 and lengthen RV activation slightly; net QRS vector shifts rightward-anterior (-x,+z). Strain: reverse transmural APD gradient in RV regions (T inversion V1-V3/inferior). RAE: increase RA dipole amplitude (P II > 0.25 mV).

**animation_3d**: Thickened RV wall; activation arrows dominated by RV; enlarged RA.

**test_oracle**:
- frontal QRS axis >= +110 deg
- V1: R amplitude > 0.7 mV or R/S > 1
- V5 or V6: S amplitude > 0.7 mV or R/S < 1
- QRS < 120 ms
- strain config: T net negative in V1-V3 and in III, aVF
- RAE config: P amplitude in II > 0.25 mV

Sources:
- https://litfl.com/right-ventricular-hypertrophy-rvh-ecg-library/
- https://litfl.com/p-wave-ecg-library/

## Hyperkalemia (staged) / 高钾血症(分期)  `hyperkalemia`  (electrolyte-drug-qt, P1-core)

**rate_rhythm**: Sinus early; later bradyarrhythmias (sinus brady, AV block, slow junctional), then sine wave, VF/PEA/asystole.

**intervals**: PR prolongs (stage 2), QRS widens (stage 3), QT normal/short early.

**lead_features**: Levis 2013 staging: K >5.5 mEq/L peaked T (earliest; tall, narrow, symmetric 'tented', best in precordial leads); K >6.5 P widening/flattening, PR lengthening, eventual P loss; K >7.0 prolonged bizarre QRS, conduction blocks, bradycardia, sine-wave (pre-terminal). LITFL: peaked T at >= 6.0 (moderate 6.0-6.9, severe >= 7.0); sine wave/VF/asystole typically > 9.0. Serum K correlates poorly with ECG.

**mechanism**: Raised extracellular K depolarizes resting membrane and accelerates IKr-dependent phase-3 repolarization (narrow tall T); Na-channel inactivation slows conduction (atria first, then His-Purkinje/ventricles).

**model_implementation**: Parameter K. Stage 1 (5.5-6.5): shorten ventricular APD and steepen repolarization (repolarization dipole amplitude x1.5-2.5, T duration shorter). Stage 2 (6.5-7.0): atrial CV x0.5 and atrial dipole amplitude down (flat, wide P), AV delay up (PR >200). Stage 3 (>7.0): global ventricular + Purkinje CV x0.5 (QRS >120, BBB-like), SA rate down. Stage 4 (>8-9): CV x0.3 so QRS merges into T (sine wave), then hand off to VF/asystole.

**animation_3d**: K+ slider; activation colors propagate visibly slower as K rises; atria fade; T-wave linked to fast synchronized repolarization flash.

**test_oracle**:
- stage 1: T amplitude in V2-V4 >= 1.5 x NSR, T half-amplitude width <= NSR, T symmetric (ascending/descending limb ratio 0.8-1.25), QRS < 120 ms
- stage 2: PR > 200 ms and P amplitude in II < 50% of NSR
- stage 3: QRS >= 120 ms and HR < 60 bpm
- stage 4: no isoelectric ST or TP segment >= 40 ms; QRS-T sinusoidal

Sources:
- https://litfl.com/hyperkalaemia-ecg-library/
- Levis JT. ECG diagnosis: hyperkalemia. Perm J 2013;17(1):69
- https://litfl.com/t-wave-ecg-library/

## Hypokalemia (U waves) / 低钾血症(U波)  `hypokalemia`  (electrolyte-drug-qt, P2-important)

**rate_rhythm**: Sinus; ectopy, AF/flutter; severe: VT, VF, TdP.

**intervals**: PR prolongation; apparent long QT (actually QU from T-U fusion).

**lead_features**: Changes usually from moderate hypokalemia 2.5-2.9 mmol/L (mild 3.0-3.4, severe <= 2.4). At K <2.7: increased P amplitude, widespread ST depression, T flattening/inversion, prominent U waves (best V2-V3); U > 1 mm (0.1 mV) prominent; U amplitude exceeds T when K <~2.7-3.0. Biphasic T goes down then up (vs ischemia up then down).

**mechanism**: Reduced IK1/IKr prolongs and flattens late repolarization; late repolarizing populations (e.g. Purkinje/M cells) produce a distinct late U deflection.

**model_implementation**: Parameter K. Lower repolarization dipole amplitude (flatter T); add a delayed repolarization population (subset of regions with APD +100-200 ms) producing a separate late dipole -> U wave after T; small ST vector opposite to QRS axis (diffuse STD); increase atrial dipole amplitude; increase AV delay.

**animation_3d**: K+ slider; after T repolarization, a second late repolarization flash in a subset (Purkinje/mid-myocardium) labelled 'U'.

**test_oracle**:
- U wave (positive deflection after T end, before next P) amplitude >= 0.1 mV in V2 or V3
- severe config: U amplitude > T amplitude in V2 or V3
- T amplitude in V4-V6 < 50% of NSR
- ST(J) <= -0.05 mV in >=2 contiguous leads
- PR > NSR PR; P amplitude in II > NSR

Sources:
- https://litfl.com/hypokalaemia-ecg-library/
- https://emra.org/emresident/article/ecg-challenge-aug-sept-2019
- https://litfl.com/t-wave-ecg-library/
- https://ecgwaves.com/topic/ecg-normal-p-wave-qrs-complex-st-segment-t-wave-j-point/

## Hypercalcemia (short QT) / 高钙血症(QT缩短)  `hypercalcemia`  (electrolyte-drug-qt, P3-nice)

**rate_rhythm**: Sinus; extreme hypercalcemia: ventricular irritability/VF.

**intervals**: QT shortened (example QT 260 ms) mainly by ST-segment shortening.

**lead_features**: Short/absent ST segment (T starts right after QRS); Osborn J waves in severe cases (notching of terminal QRS, best V1). Ca normal 2.1-2.6 mmol/L; mild 2.7-2.9; moderate 3.0-3.4; severe >3.4 (Osborn example at 4.1).

**mechanism**: High extracellular Ca shortens the AP plateau (phase 2) via faster Ca-dependent inactivation -> shorter ST.

**model_implementation**: Shorten ventricular APD plateau uniformly (phase 2 -60 to -100 ms) keeping phase-3 shape; severe: add epicardial notch J-vector (as in hypothermia) at QRS end.

**animation_3d**: Plateau phase color band visibly shortened; repolarization follows QRS immediately.

**test_oracle**:
- QTc < NSR QTc - 40 ms (config default QTc ~350-370 ms)
- ST segment (J to T onset) duration < 40 ms in II
- T morphology correlation with NSR T >= 0.9 after time-alignment
- severe config: J-point positive notch >= 0.1 mV in >=2 leads

Sources:
- https://litfl.com/hypercalcaemia-ecg-library/
- https://litfl.com/qt-interval-ecg-library/

## Hypocalcemia (long QT via long ST) / 低钙血症(ST段延长致QT延长)  `hypocalcemia`  (electrolyte-drug-qt, P3-nice)

**rate_rhythm**: Sinus; arrhythmias uncommon (AF reported; TdP rarer than with hypoK/hypoMg).

**intervals**: QTc prolonged primarily by lengthening the ST segment (examples QTc 500 and 510 ms at Ca 1.40 and 1.32 mmol/L).

**lead_features**: Long isoelectric ST, normal T-wave shape/duration. Ca normal 2.2-2.6; mild-moderate 1.9-2.2; severe <1.9 mmol/L.

**mechanism**: Low extracellular Ca prolongs AP plateau (slower Ca-dependent inactivation of L-type current), delaying phase 3 onset.

**model_implementation**: Lengthen ventricular APD plateau uniformly (+60 to +120 ms) without changing phase-3 slope or transmural gradient -> ST lengthens, T unchanged.

**animation_3d**: Plateau color band visibly prolonged before repolarization wave.

**test_oracle**:
- QTc >= 480 ms (config default ~500 ms)
- T duration and amplitude within +/-15% of NSR
- ST segment duration (J to T onset) >= NSR + 60 ms
- QRS unchanged

Sources:
- https://litfl.com/hypocalcaemia-ecg-library/
- https://litfl.com/qt-interval-ecg-library/

## Long QT syndrome (congenital LQT1-3 / acquired) / 长QT综合征  `long-qt-syndrome`  (electrolyte-drug-qt, P2-important)

**rate_rhythm**: Sinus; risk of TdP (pause-dependent, R-on-T); bigeminy may herald TdP.

**intervals**: QTc normal <440 men/<460 women; >500 ms associated with TdP risk. 2017 AHA/ACC/HRS: LQTS diagnosed by Schwartz score >= 3.5 or QTc >= 500 ms on repeated ECGs (no secondary cause) or pathogenic variant. Schwartz QTc points: >= 480 ms = 3; 460-479 = 2; 450-459 (men) = 1.

**lead_features**: LQT1 (IKs, KCNQ1): smooth broad-based T, most leads, esp. precordial (or late-onset normal-appearing T). LQT2 (IKr, KCNH2): bifid/notched, low-amplitude T. LQT3 (SCN5A late INa): long isoelectric ST with late-appearing T. Measure QT in lead with longest QT (II or V5-V6), tangent method.

**mechanism**: Reduced repolarizing K currents or increased late Na current prolong ventricular APD and increase dispersion of repolarization -> EADs.

**model_implementation**: LQT1: prolong APD with wide spread of regional APDs (broad T). LQT2: bimodal APD distribution (two repolarizing populations ~40-80 ms apart) with reduced repolarization amplitude (notched low T). LQT3: prolong plateau (like hypocalcemia) keeping steep phase 3. Keep APD restitution so QT adapts to rate. Link to TdP entry for arrhythmia.

**animation_3d**: APD map with long red plateau; genotype selector shows ion-channel icon and resulting T shape; QT ruler on ECG.

**test_oracle**:
- QTc (Bazett) >= 480 ms (config default 500 ms)
- QRS duration within +/- 5 ms of NSR
- LQT2 config: T in >=2 of V2-V5 has two local maxima separated by >= 40 ms and T amplitude < 70% of NSR
- LQT1 config: T duration >= 1.3 x NSR T duration
- LQT3 config: ST segment duration >= NSR + 80 ms with T duration within +/- 20% of NSR

Sources:
- https://litfl.com/qt-interval-ecg-library/
- https://litfl.com/polymorphic-vt-and-torsades-de-pointes-tdp/
- https://www.msdmanuals.com/professional/multimedia/table/modified-schwartz-score-for-long-qt-syndrome-lqts
- https://professional.heart.org/en/science-news/2017-guideline-for-management-of-patients-with-ventricular-arrhythmias-and-the-prevention-of-scd
- Moss AJ et al. ECG T-wave patterns in genetically distinct forms of the hereditary long QT syndrome. Circulation 1995;92:2929-2934

## Acute pericarditis / 急性心包炎  `acute-pericarditis`  (other, P2-important)

**rate_rhythm**: Sinus, often tachycardic.

**intervals**: PR segment depressed; intervals otherwise normal.

**lead_features**: Widespread concave ST elevation and PR depression in I, II, III, aVL, aVF and V2-V6; reciprocal ST depression and PR elevation in aVR (+/- V1); no other reciprocal ST depression. STE typically modest 0.5-1 mm. ST/T ratio in V6 >0.25 favors pericarditis over benign early repolarization (<0.25). Spodick sign (downsloping TP segment, best in II and lateral precordial leads) in 29% of pericarditis vs 5% of STEMI. Stages: 1 (first 2 weeks) STE+PR depression; 2 (1-3 wk) normalization/T flattening; 3 (3+ wk) T inversion; 4 normalization (<50% go through all stages).

**mechanism**: Inflammation of epicardium/pericardium produces a diffuse epicardial (ventricular) and atrial current of injury, not confined to a coronary territory.

**model_implementation**: Diffuse epicardial injury vector = sum over all epicardial ventricular regions of outward local vectors -> net vector along mean ventricular axis toward apex (frontal ~+45..+60 deg, slightly anterior), magnitude ~0.1 mV, applied during plateau -> STE in most leads, STD in aVR by projection. Atrial injury vector applied during PR segment (P end -> QRS onset), directed opposite to the P axis (PR depression in II, elevation in aVR). Spodick: optional diastolic injury term decaying across TP. Stage selector modulates terms (stage 3: invert T by uniform transmural APD reversal).

**animation_3d**: Pericardial sac rendered and glowing over the entire heart (no coronary occlusion); diffuse epicardial shading; normal contraction; side-by-side comparison with STEMI territory.

**test_oracle**:
- ST(J) >= 0.05 mV in >= 7 of {I, II, aVL, aVF, V2, V3, V4, V5, V6}
- ST(J) in aVR <= -0.05 mV
- PR-segment level (relative to TP baseline) <= -0.05 mV in II and >= +0.05 mV in aVR
- no lead other than aVR and V1 with ST(J) <= -0.05 mV
- ST elevation concave-up (mid-ST below straight line from J to T peak) in V5
- ST/T amplitude ratio in V6 > 0.25
- max ST(J) < 0.5 mV

Sources:
- https://litfl.com/pericarditis-ecg-library/
- https://litfl.com/spodick-sign/
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7752795/

## Brugada pattern type 1 (coved) / Brugada综合征1型(穹窿型)  `brugada-type-1`  (other, P2-important)

**rate_rhythm**: Sinus; risk of polymorphic VT/VF (often nocturnal).

**intervals**: QRS usually <120 ms (RBBB-like terminal deflection in V1 possible); PR may be prolonged.

**lead_features**: Type 1 (only diagnostic type): coved ST elevation >= 2 mm (0.2 mV) in >= 1 right precordial lead V1-V2(-V3), recorded in 4th, 3rd or 2nd intercostal space, followed by negative T. Type 2 (saddleback): STE >= 0.5 mm (generally >= 2 mm in V2) with convex ST; type 3: STE <1 mm. Changes confined to right precordial leads.

**mechanism**: Outward shift of currents in RV (outflow tract) epicardium: prominent Ito-mediated notch and loss of AP dome in RVOT epicardium but not endocardium -> transmural voltage gradient (coved STE) with delayed epicardial repolarization (negative T); phase-2 reentry -> VF.

**model_implementation**: Local RVOT epicardial modification only: (1) additive J/ST vector during early plateau directed from RVOT toward overlying anterior chest (anterior-rightward-superior: -x, -y, +z), decaying linearly over ~200 ms (coved shape); (2) prolong RVOT epicardial APD beyond endocardial (reversed transmural gradient) -> negative T in V1-V2. Electrodes V1/V2 overlie RVOT so projection is large there and small elsewhere; moving V1/V2 to 2nd-3rd ICS (electrode module) increases amplitude.

**animation_3d**: RVOT highlighted; inset of epicardial vs endocardial action potentials showing loss of dome; electrode-placement tool to slide V1/V2 up one or two intercostal spaces.

**test_oracle**:
- ST(J) >= 0.2 mV in V1 or V2
- coved: ST descends monotonically from J to T nadir in that lead (no ST trough followed by rise) and T net negative
- |ST(J)| < 0.1 mV in I, II, V4, V5, V6
- QRS < 120 ms
- high-ICS config: ST(J) in V1/V2 greater than at 4th ICS

Sources:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5035208
- https://litfl.com/brugada-syndrome-ecg-library/

## Hypothermia (Osborn J waves) / 低体温(Osborn J波)  `hypothermia`  (other, P3-nice)

**rate_rhythm**: Sinus bradycardia (may be marked), AF with slow ventricular response, slow junctional rhythm, 1st-3rd degree AV block; arrest by VT, VF or asystole. Shivering artefact (baseline fuzziness).

**intervals**: Prolonged PR, QRS and QT.

**lead_features**: Osborn (J) wave: positive extra deflection at J point, height roughly proportional to degree of hypothermia; seen in precordial and limb leads with reciprocal negative deflection in aVR and V1; typically <30 C but subtle at 32.5 C. Severity: mild 32-35 C, moderate 29-32 C, severe <29 C.

**mechanism**: Cold enhances the Ito-mediated spike-and-dome AP notch in epicardium but not endocardium (Yan & Antzelevitch 1996) -> transmural gradient at end of depolarization = J wave; cold slows automaticity, conduction and repolarization.

**model_implementation**: Temperature parameter T_core. SA rate scaled down (Q10-type), AV delay up, ventricular CV down (QRS longer), APD up (QT longer). Add epicardial notch vector at QRS end: direction along mean ventricular depolarization axis (leftward-inferior), duration ~40-80 ms, amplitude increasing as temperature falls. Optional shivering noise and switch to slow AF.

**animation_3d**: Heart tinted blue with thermometer slider; slow beat; inset epicardial AP showing deepening notch; J wave highlighted on ECG.

**test_oracle**:
- HR < 60 bpm
- PR, QRS and QT each greater than NSR values
- J-point positive notch amplitude >= 0.1 mV in >=2 of II, V3, V4, V5, V6 (moderate config)
- J deflection negative in aVR
- J-wave amplitude increases monotonically as configured temperature decreases (35 -> 32 -> 29 -> 26 C)

Sources:
- https://litfl.com/hypothermia-ecg-library/
- https://litfl.com/osborn-wave-j-wave-ecg-library/
- https://litfl.com/hypercalcaemia-ecg-library/

## Digoxin effect / 洋地黄效应  `digoxin-effect`  (electrolyte-drug-qt, P3-nice)

**rate_rhythm**: Usually sinus or rate-controlled AF. Effect is not a marker of toxicity.

**intervals**: Short QT; mild PR prolongation up to 240 ms.

**lead_features**: Downsloping 'reverse tick' / sagging ST depression (most evident V4-V6, I, aVL, II, III, aVF); T flattened, inverted or biphasic (initial negative, terminal positive, esp. V4-V6); J-point depression in leads with tall R; prominent U waves.

**mechanism**: Shortened ventricular refractory period/APD and increased vagal effect on AV node.

**model_implementation**: Shorten ventricular APD (short QT); add ST vector opposite to mean QRS axis whose amplitude decays through the ST into early T (sagging shape); increase AV-node delay (PR 200-240 ms). Toxicity (optional, separate): PVC bigeminy, bidirectional VT via alternating fascicular foci.

**animation_3d**: Drug icon; AV node slowed slightly; shortened plateau band.

**test_oracle**:
- ST(J) <= -0.05 mV in V4-V6 with concave-up downsloping ST (sagging)
- QTc < NSR QTc
- PR <= 240 ms (and > NSR PR when PR effect enabled)
- T in V5-V6 biphasic (negative then positive) or flattened (< 50% NSR amplitude)

Sources:
- https://litfl.com/digoxin-effect-ecg-library/

## Acute pulmonary embolism (RV strain, S1Q3T3) / 急性肺栓塞(右心负荷, S1Q3T3)  `pulmonary-embolism-s1q3t3`  (other, P3-nice)

**rate_rhythm**: Sinus tachycardia (44%, most common); atrial tachyarrhythmias 8%.

**intervals**: QRS may be >=120 ms if RBBB (complete or incomplete 18%).

**lead_features**: S1Q3T3 (deep S in I, Q in III, inverted T in III) 20%; RV strain T inversion V1-V4 +/- II, III, aVF 34% (simultaneous inferior + V1-V4 TWI most specific vs ACS); RBBB 18%; RAD 16%; P pulmonale (P in II >2.5 mm) 9%; clockwise rotation.

**mechanism**: Acute RV pressure overload and dilation -> rightward forces, delayed RV conduction, RV subendocardial strain/repolarization abnormality, sympathetic tachycardia.

**model_implementation**: Rhythm: SA rate 100-130. RV: increase RV dipole weight modestly and rotate heart clockwise (around long axis) in thorax transform; slow RBB edge (incomplete/complete RBBB) -> late rightward terminal forces (S in I); reverse RV transmural APD gradient (T inversion V1-V4, III). RA dipole amplitude up (P pulmonale).

**animation_3d**: Pulmonary artery clot icon; dilated RV; slowed right bundle; RV repolarization map inverted.

**test_oracle**:
- HR > 100 bpm
- S wave in I >= 0.15 mV
- Q wave present in III (>= 0.1 mV) with T net negative in III
- T net negative in V1-V3
- RBBB config: QRS >= 120 ms with R' in V1

Sources:
- https://litfl.com/ecg-changes-in-pulmonary-embolism/
- https://litfl.com/right-bundle-branch-block-rbbb-ecg-library/

## Unsourced / design choices

- AHA/ACCF/HRS 2009 Parts III, IV, V and VI (Surawicz, Rautaharju, Hancock, Wagner) returned HTTP 403 and were not read; their criteria are relayed via ecgpedia/Wikipedia/LITFL/EM sites. Part IV short-QT cut-off (QTc <= 390 ms) and QTc prolonged >= 450 men / >= 460 women not verified.
- Fourth Universal Definition of MI full text was not retrieved; STEMI J-point thresholds and Q-wave criteria come from secondary reproductions (ebmedicine/emra/wikem/ecgpedia). Right-sided V3R/V4R threshold (UDMI: >= 0.05 mV, >= 0.1 mV in men <30 y) NOT verified; secondary literature uses V4R >= 1 mm (93% sensitivity, search snippet only).
- LITFL pages for complete heart block (first URL), R-wave progression, QRS complex, Q wave and long QT syndrome returned 403; classic LITFL Q criteria (>40 ms, >2 mm, >25% of QRS) not verified.
- AF fibrillatory rate 350-600/min (only '>500 bpm local activation' sourced) and its 5.8-10 Hz oracle band.
- Mobitz I: pause containing the dropped beat < 2 x PP (follows from the pattern but not stated in source).
- Ventricular escape QRS >= 120 ms in complete heart block (rate 20-40 is sourced; width is general knowledge).
- WPW left-lateral specifics (delta negative/isoelectric in I and/or aVL); Arruda algorithm steps were not retrieved. Delta-slope oracle (<50% of NSR slope) is a design choice.
- LQT3 morphology (long isoelectric ST, late-onset T) not confirmed in retrieved text; LQT1/LQT2 morphology from Moss 1995 via search snippet. Numeric LQT morphology oracles (notch separation >= 40 ms, T duration >= 1.3x) are design choices.
- Ventricular myocardial conduction velocity (~0.3-1 m/s, used for trans-septal RBBB/LBBB delay and PVC spread), AV-nodal recovery-curve parameters, transmural/apex-base APD gradients and all APD/CV scaling factors (e.g. CV x0.5 in hyperK) are model design values, not sourced.
- Durrer 1970 posterobasal latest activation time (~60-80 ms) not confirmed in retrieved text (only 'posterobasal usually last').
- QRS predominantly negative in aVR in sinus rhythm (P and T negative are sourced).
- Coarse vs fine VF amplitude cut-offs not available in LITFL; VF dominant frequency oracle 2.5-8.3 Hz derived from the sourced 150-500/min rate.
- Torsades rate 150-250 bpm and 5-20 beat twisting cycles come from an emedicine page seen only as a search snippet.
- Hyperkalemia staging thresholds differ between Levis 2013 (>5.5/>6.5/>7.0) and LITFL (peaked T >= 6.0; sine wave/VF > 9.0); Levis article was cited from a search snippet (PMC id not verified).
- U-wave criteria (U > 1 mm prominent; U > T when K < ~2.7-3.0) from EM secondary sources via search snippets.
- AVNRT RP < 70 ms / < 90 ms from ecgbook.com and ACC ECG-of-the-month (search snippets); the 2015 ACC/AHA/HRS SVT guideline itself not retrieved. AVNRT pathway conduction times (SP 250-350 ms, FP 50-80 ms) are design values.
- All 3D injury/ST vector directions and angles per coronary territory (anterior ~(+0.3,+0.2,+0.9), RCA ~+110..+120 deg, LCx ~+70..+90 deg, lateral ~-20..-40 deg, posterior -z, subendocardial toward aVR ~-150 deg, pericarditis along mean axis, Brugada RVOT anterior-rightward-superior, Osborn along QRS axis) are physiologically motivated model design choices, not literature values. The general principle (epicardial/transmural injury -> ST elevation over the injured region; subendocardial -> ST depression, non-localizing, aVR elevation) is supported by LITFL and Hurst 2007 (abstract-level).
- AHA segment numbers assigned to coronary territories (LAD 1,2,7,8,13,14,17; RCA 3,4,9,10,15; LCx 5,6,11,12,16) follow the standard 17-segment model but were not retrieved in this session.
- Pericarditis PR-depression magnitude (>= 0.05 mV oracle) and max STE < 0.5 mV oracle are design thresholds (LITFL gives typical STE 0.5-1 mm only).
- PE S-wave depth (>= 0.15 mV) and Q3 depth (>= 0.1 mV) oracle thresholds are design choices; LITFL only describes 'deep S' and 'Q in III'.
- Sinus arrhythmia respiratory frequency 0.2-0.3 Hz and inspiratory acceleration direction are general physiology.
- Hypercalcemia oracle thresholds (QTc reduction >= 40 ms, ST < 40 ms) and hypocalcemia (ST +60 ms) are design values derived from the qualitative descriptions and LITFL examples.
- Generic oracle tolerances (template correlation >= 0.95, RR CV > 0.10, 1.5x T amplitude for hyperacute/peaked T, PP' < 0.85 x PP for PAC, >= 8 of 12 leads discordant for PVC) are test-design choices.
- Standard precordial electrode positions V1-V6 (V1/V2 4th ICS right/left sternal border, V4 5th ICS midclavicular, V3 midway, V5 anterior axillary, V6 midaxillary at V4 level) per AHA Part I (Kligfield 2007) not retrieved in this session.
- Global interval measurement across 12 leads (earliest onset to latest offset) as the measurement convention is a standard computerized-ECG practice not retrieved here.
- Low-QRS-voltage criteria (<5 mm all limb leads, <10 mm all precordial leads) not retrieved.
