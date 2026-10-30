# Research: activation-physiology

> Generated 2026-10-08 by read-only research agents. Numbers carry citations; items under "Unsourced" are general knowledge or design choices and must be treated as tunable.

## Summary

TIMELINE (ms from P onset, ~70-80 bpm; Malmivuo & Plonsey Table 6.1): SA node 0, RA 5, LA 85, AV node arrival 50 / departure 125, His 130, bundle branches 145, Purkinje 150, septal endocardium 175, LV endocardium 190, LV epicardium 225, RV epicardium 250, LV epicardial repolarization 400, LV endocardial repolarization 600. The time column agrees across both fetches; the labels and velocity columns in the HTML table are misaligned. Two caveats: the 175-to-250 ms span makes ventricular activation about 75 ms, and the 200 ms endo-epi repolarization gap is a simplified textbook figure (in vivo fits give about 30 ms). Intracardiac intervals: PA 20-60 ms, AH 50-120 ms, HV 35-55 ms (Denker 1984: HV 48±5, H-RB 27±6, RB-V 21±7 ms).
VENTRICLES (Durrer 1970 abstract): three LV endocardial sites fire 0-5 ms after LV cavity potential onset: (1) high anterior paraseptal just below the mitral attachment, (2) central left septal surface, (3) posterior paraseptal about 1/3 of the way from apex to base. They become confluent by 15-20 ms. Septum is activated from its middle third on the left side, somewhat anteriorly. RV endocardium starts near the anterior papillary muscle at 5-10 ms. Usually the LV posterobasal area is last. In vivo ECGI (Ramanathan 2006): RV anterior paraseptal epicardial breakthrough at 18-24 ms, LV breakthroughs about 7 ms later, last activation at LV base or RVOT, QRS 76-100 ms.
CONDUCTION VELOCITY: AV node 0.02-0.05 m/s. His and bundle branches 1.0-1.5 m/s. Purkinje 3.0-3.5 m/s (Malmivuo), 2-4 m/s in models. Atrial muscle 0.8-1.0 m/s; crista terminalis 1.28 m/s along the fibres, 0.73 m/s across. Human LV muscle: 0.56-0.95 m/s along fibres, 0.15-0.45 m/s across, anisotropy about 2-3.8:1. ECGSIM defaults: LV/RV endocardium 1.0, epicardium 0.8, transmural 0.5 m/s. An EDL variant uses 0.85 m/s on the surface and 2.5x slower transmurally.
REPOLARIZATION: in vivo mean ARI (≈APD) 235 ms (range 200-260). LV apex-to-base ARI dispersion 42 ms; LV ARI exceeds RV by 32 ms. Human LV wedge APD80: epi 380, mid 450, endo 479, M islands 527 ms (TDR 104 ms). In intact human hearts there is no late midmural repolarization (Opthof 2017). EDL T-wave fit (Kloosterman 2023): apico-basal RT gradient 65 ms (later at base) gives the best fit (CC 0.91); best transmural gradient is 30 ms (endo later); interventricular -8 ms. Concordant T needs epi RT < endo RT, apex RT < base RT, and LV RT < RV RT.
TMP TEMPLATE (van Dam/van Oosterom patent): L(t;τ,β)=1/(1+e^{-β(t-τ)}), D=L(t;δ,β), R=L(t;ρ,β1)L(t;ρ,β2) (as quoted; R must fall at ρ, so implement it as a decreasing logistic), S=D·R. β=2 /ms gives 50 mV/ms upstroke; rest -85 mV, peak +15 mV. Plateau option: Vm=(1+a t)/(1+e^{R(t-Trep)}) with a decline of 5-40% at 200 ms.
FORWARD MODEL: φ(t,ℓ)=Σ_n B(ℓ,n)S(t;δn,ρn). Dipole field Φ=p·∇(1/r)/(4πσ); WCT=(ΦR+ΦL+ΦF)/3; aVF=ΦF-(ΦR+ΦL)/2. Double-layer strength 8 μA/mm = 0.2 S/m × 40 mV. Solid-angle form ε=(Ω/4π)ΔVm·K.
VCG TARGETS (Sur 2013, Frank leads): QRS peak 2.53±0.67 mV in men, 2.18±0.62 mV in women; T peak 0.80 / 0.60 mV; spatial peak QRS-T angle 57±34° / 47±26°; SVG 104 / 84 mV·ms. An older Japanese cohort gives QRS max 1.63±0.42 mV, T 0.59±0.11 mV, QRS-T 27±15°. Upper normal QRS-T limit about 116-130°.
MECHANICS: IVCT 34-36 ms, ejection 281-293 ms, IVRT 92-94 ms (TDI). LV onset of shortening spreads over only 35±9 ms (lateral wall first, septum last); peak shortening spreads over 121 ms. Mechanical activation ≈ 1.06×electrical + 8.4 ms (animal data). P onset to atrial A' wave: 37 ms (tricuspid), 45 ms (septal), 60 ms (lateral).

## 1. Durrer 1970 normal ventricular activation (isolated human heart)  _(confidence: high)_

Seven hearts, up to 870 intramural terminals. Three LV endocardial areas are 'synchronously excited 0 to 5 msec after the start of the left ventricular cavity potential': (1) high on the anterior paraseptal wall just below the mitral attachment; (2) central left surface of the interventricular septum; (3) posterior paraseptal, about 1/3 of the distance from apex to base. These areas grow over the next 5-10 ms and become confluent by 15-20 ms. Septal activation starts in the middle third of the LEFT septal side, somewhat anteriorly, and in the lower third at the septum/posterior-wall junction, so the septum is activated left to right. RV endocardial activation starts near the insertion of the anterior papillary muscle at 5-10 ms. The posterobasal LV is usually the last LV part activated. The epicardial pattern mirrors the intramural wave. A later summary of Durrer describes nine possible early sites: 4 on the LV septum, 2 at the bases of the LV posterior and anterior papillary muscles, 2 on the RV septum (Roudijk 2021). Ventricular activation proceeds radially from LV endocardium to epicardium (Malmivuo ch. 6 isochrone figure).

Sources:
- Durrer D, van Dam RT, Freud GE, Janse MJ, Meijler FL, Arzbaecher RC. Total excitation of the isolated human heart. Circulation 1970;41:899-912. doi:10.1161/01.CIR.41.6.899 (abstract text via https://www.citedrive.com/en/discovery/total-excitation-of-the-isolated-human-heart/)
- Roudijk RW et al. Front Physiol 2021;12:730736 (PMC8521153) https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8521153/fullTextXML
- Malmivuo J, Plonsey R. Bioelectromagnetism, 1995, ch. 6 https://www.bem.fi/book/06/06.htm

## 1b. In-vivo normal activation and repolarization (ECGI, healthy adults)  _(confidence: high)_

Ramanathan 2006 (n=7 healthy): the earliest RV epicardial breakthrough is anterior paraseptal at 18-24 ms after QRS onset (earliest 18 ms). LV breakthroughs follow about 7 ms after RV breakthrough, with several sites active within 40 ms. The posterior LV activates apex to base. Last activation is at the LV base or RVOT. QRS 76-100 ms. Atria: activation spreads from the sinus node and ends at the LA appendage. Mean ARI 235 ms (per-subject 200-260). LV apex-to-base ARI dispersion is 42 ms (30-52). LV ARI exceeds RV ARI by 32 ms. Repolarization sequence is set by local APD, not by activation sequence. Andrews & Rudy 2019 (ECGI + tagged MRI): earliest activation between lateral and anterior RV in mid/basal regions; latest in basal LV. ARI median 238 ms (female 261, male 229). Peak strain about 430 ms after QRS onset. LV segment contractions are synchronous in healthy hearts. Roudijk 2021: earliest-to-latest activation range 111±23 ms (non-invasive) vs 124±39 ms (invasive).

Sources:
- Ramanathan C, Jia P, Ghanem R, Ryu K, Rudy Y. Activation and repolarization of the normal human heart under complete physiological conditions. PNAS 2006;103:6309-14. PMC1458874 https://pmc.ncbi.nlm.nih.gov/articles/PMC1458874/
- Andrews CM et al. Electromechanics of the normal human heart in situ. Circ Arrhythm Electrophysiol 2019;12:e007484. PMC7010071 https://pmc.ncbi.nlm.nih.gov/articles/PMC7010071
- Roudijk RW et al. Front Physiol 2021;12:730736 (PMC8521153)

## 2. Conduction-system timeline (Malmivuo & Plonsey Table 6.1)  _(confidence: medium)_

Times in ms from SA-node impulse: SA node 0; RA depolarization 5; LA depolarization 85 (P wave); AV node arrival 50, departure 125 (P-Q); His 130; bundle branches 145; Purkinje 150; septal endocardium 175 (QRS); LV endocardium 190; LV epicardium 225; RV epicardium 250; LV epicardial repolarization 400 (T); LV endocardial repolarization 600. Velocity column: SA 0.05, atrium 0.8-1.0, AV node 0.02-0.05, His 1.0-1.5, bundle branches 1.0-1.5, Purkinje 3.0-3.5, ventricular muscle '0.3 (axial)'/'0.8 (transverse)' and 0.5 m/s. Intrinsic rate: SA 70-80/min, AV/His/Purkinje 20-40/min. CAVEAT: the HTML table rows are misaligned and two fetches gave different label/velocity pairings. The time column is consistent across both. Do not use the ventricular 'axial/transverse' labels; use the human ventricular velocities in finding 3b. The 400 vs 600 ms epi/endo repolarization is a simplification; finding 4b gives a 30 ms transmural RT fit. Implied checks: atrial span about 80 ms, His→septal endocardium = 45 ms (matches HV 35-55), ventricular span about 75 ms. Text: ventricular AP about 100 mV amplitude, rest about -80 mV, about 300 ms duration.

Sources:
- Malmivuo J, Plonsey R. Bioelectromagnetism. Oxford Univ Press 1995, ch. 6 Table 6.1 https://www.bem.fi/book/06/06.htm

## 2b. AV node / His-Purkinje intervals  _(confidence: medium)_

PA 20-60 ms; AH 50-120 ms (varies with autonomic tone); HV 35-55 ms (constant). Another review gives PA 9-145, AH 45-140, HV 35-55 ms. Denker 1984 (14 patients, normal HV): HV 40-55 ms (mean 48±5); His→right bundle (H-RB) 20-35 ms (27±6); RB→ventricle (RB-V) 10-30 ms (21±7); atrial basic cycle length 743±87 ms. His-Purkinje relative refractory period 440±43 ms (constant cycle length) and 463±52 ms (alternating cycle length). His-Purkinje ERP 435±23 → 454±20 ms. Usable split for a 160 ms PR: AV node transit about 75-90 ms (AH), His→ventricle about 45 ms.

Sources:
- Denker S, Lehmann M, Mahmud R, Gilbert C, Akhtar M. Effects of alternating cycle lengths on refractoriness of the His-Purkinje system. J Clin Invest 1984;74:559-570 https://www.jci.org/articles/view/111453
- https://www.hmpgloballearningnetwork.com/site/eplab/articles/components-ep-study-part-1
- https://www.scielo.br/j/ijcs/a/SxJPc98pnGtg8mspNwX4K6q/?lang=en

## 2c. SA node and atrial activation  _(confidence: medium)_

SA node: crescent-shaped, long axis parallel to the terminal groove, at the SVC-RA junction. Mean length 13.5±2.5 mm (range 8-21.5 mm; 47 hearts). Entirely subepicardial in 72% of hearts; inner aspect subendocardial in 28%. High-resolution epicardial mapping (cardiac-surgery patients without AF): total atrial activation 114±17 ms (74-156); with AF 136±20 ms. Bachmann's bundle (BB) activation time 87±16 ms; RA 67±14 ms; LA 46±15 ms. Interatrial conduction via BB 90±18 ms vs via the pulmonary-vein area 101±20 ms. BB is activated by a single right-to-left wavefront in 64%, from its centre in 7%, by multiple wavefronts in 28-29%. Activation ends at the LA appendage (Ramanathan 2006). Crista terminalis velocity: 1.28±0.43 m/s along fibres vs 0.73±0.30 m/s across. BB regions conducting faster than 1.7 m/s were classed as simultaneously activated. P-wave duration ≥120 ms defines interatrial block.

Sources:
- Sanchez-Quintana D et al. Sinus node revisited in the era of electroanatomical mapping and catheter ablation. Heart 2005;91:189-194 https://heart.bmj.com/content/91/2/189
- Mouws EMJP et al. Impact of ischemic and valvular heart disease on atrial excitation: a high-resolution epicardial mapping study. J Am Heart Assoc 2018 (PMC5907575) https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5907575/fullTextXML
- https://scholar.nycu.edu.tw/en/publications/functional-characterization-of-the-crista-terminalis-in-patients-/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7877939

## 3. Conduction velocities, ventricular myocardium (human)  _(confidence: high)_

Review table, human LV, CV along fibres / across fibres. Control LV epicardium (Anderson 1993): 0.80±0.08 / 0.23±0.03 m/s. Control LV (Doshi 2015): 0.561 / 0.146 m/s. Control LV (Lang 2015): 0.95±0.05 / 0.45±0.05 m/s. LV free wall in CAD (Taggart 2000): 0.65 / 0.48 m/s. Anisotropy in healthy controls: 2.11 to 3.84; classic ventricular value about 2:1 (Spach 1981). Model conductivities (bidomain, mS/cm): intracellular along fibres 1.6-4.5, across 0.19-0.6; extracellular along 1.2-6.3, across 0.8-3.1. Simulation defaults: ECGSIM v2.2 foci editor uses LV endocardium 1.0, RV endocardium 1.0, epicardium 0.8, transmural 0.5 m/s. An EDL model uses 0.85 m/s on the surface, 2.5x slower across the wall (about 0.34 m/s), and 0.25 m/s for severe disease. Brugada demo: velocity cut by 80% in an 18 mm-radius RVOT epicardial zone. Example LBBB in ECGSIM: removing LV foci lengthens QRS from 102 to 130 ms.

Sources:
- Fu Z et al. Progress of conductivity and conduction velocity measured in human and animal hearts. Rev Cardiovasc Med 2024;25(10):364 (PMC11522836) https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11522836/fullTextXML
- van Dam PM, Oostendorp TF, van Oosterom A. Interactive simulation of the activation sequence: replacing effect by cause. Computing in Cardiology 2011;38:657-660 https://pprd.cinc.org/archives/2011/pdf/0657.pdf
- Incorporating structural abnormalities in equivalent dipole layer based ECG simulations. Front Physiol 2022;13:1089343 (PMC9814485) https://pmc.ncbi.nlm.nih.gov/articles/PMC9814485/

## 3b. Specialized conduction velocities  _(confidence: medium)_

SA node about 0.05 m/s; AV node 0.02-0.05 m/s; His bundle 1.0-1.5 m/s; bundle branches 1.0-1.5 m/s (Malmivuo; another teaching source gives bundle branches about 2 m/s). Purkinje 3.0-3.5 m/s (Malmivuo); 2-4 m/s (ten Tusscher & Panfilov 2008, conduction-system model). Atrial working muscle 0.8-1.0 m/s; crista terminalis 1.28 m/s along fibres; Bachmann's bundle above 1.7 m/s.

Sources:
- https://www.bem.fi/book/06/06.htm
- ten Tusscher KHWJ, Panfilov AV. Modelling of the ventricular conduction system. Prog Biophys Mol Biol 2008;96:152-170 (https://www.simula.no/publications/modeling-ventricular-conduction-system)
- https://www.osmosis.org/learn/Cardiac_conduction_velocity

## 3c. Refractory periods  _(confidence: low)_

His-Purkinje: relative refractory period 440±43 ms and ERP 435±23 ms at atrial cycle length 743±87 ms (Denker 1984). RV ERP at 600 ms pacing cycle length: 241±19 ms (search snippet; AF-cardioversion study population). Atrial ERP 195.5±18.8 ms in washout patients at pacing cycle lengths 300-700 ms (search snippet). ERP rises with basic cycle length; ERP-V/QT ratio 0.77 with atrial pacing vs 0.60 with ventricular pacing. Textbook EP-lab ranges (atrium 170-300, AV node 230-425, ventricle 170-290 ms) could not be confirmed and are listed under unsourced.

Sources:
- https://www.jci.org/articles/view/111453
- https://www.ncbi.nlm.nih.gov/pubmed/11502045
- https://heart.bmj.com/content/69/4/356.full.pdf

## 4. Ventricular APD: transmural, apex-base and LV-RV gradients  _(confidence: high)_

Non-failing human LV wedges (Glukhov 2010), APD80: subepicardium 380±17 ms, midmyocardium 450±26 ms, subendocardium 479±23 ms, M-cell islands in deep subendocardium 527±43 ms. Transmural dispersion 104±17 ms (up to 147 ms). These come from few (5), not entirely normal hearts at slow pacing. Intact Langendorff human hearts (Opthof 2017; 3 donors, 92 electrodes on 24 transmural needles): repolarization gradients along all axes, no late midmural repolarization, ARI coefficient of variation 7-17%. Activation-repolarization relationship is negative along the epicardium but positive for the whole heart; last-activated areas do NOT repolarize first. In vivo: mean ARI 235 ms; LV apex-base dispersion 42 ms; LV-RV +32 ms (Ramanathan 2006). Ravon 2019 uses an APD range of 225-285 ms. Use in-vivo ARI (about 235-240 ms at rest) for absolute timing. Wedge values describe only the direction of the transmural gradient (epi shortest).

Sources:
- Glukhov AV et al. Transmural dispersion of repolarization in failing and nonfailing human ventricle. Circ Res 2010;106:981-991; values as quoted in Circ Res 2010;106:815-817 (PMC2859894) https://pmc.ncbi.nlm.nih.gov/articles/PMC2859894
- Opthof T et al. Cardiac activation-repolarization patterns and ion channel expression mapping in intact isolated normal human hearts. Heart Rhythm 2017;14:265-272 doi:10.1016/j.hrthm.2016.10.010 https://ddd.uab.cat/record/288952
- PMC1458874

## 4b. Repolarization gradients that produce an upright, concordant T (EDL model)  _(confidence: high)_

Kloosterman 2023: 9 control subjects, 67-lead BSPM, subject-specific CT/MRI models, boundary-element transfer matrix, EDL source strength 40 mV. Concordant T waves arise when epicardial repolarization times (RT) < endocardial RT (transmural), LV RT < RV RT (interventricular), and RT increases from apex to base. Best-fit gradients (median, Q1-Q3): apico-basal 65 ms (56-67), CC 0.83 (0.79-0.89); transmural 30 ms (28-30), CC 0.77; interventricular -8 ms (-11 to -4), CC 0.72. Combining all three: CC 0.84, best amplitude match (relative difference 0.59-0.61). Apex-base RT map spans about 190-205 ms in their figure. Tissue conductivities: 0.2 (myocardium), 0.6 (blood), 0.4 and 0.2 S/m (thorax, lungs).

Sources:
- Kloosterman M, Boonstra MJ, van der Schaaf I, Loh P, van Dam PM. Exploring ventricular repolarization gradients in control subjects using the equivalent dipole layer. Computing in Cardiology 2023;50. doi:10.22489/CinC.2023.154 https://cinc.org/archives/2023/pdf/CinC2023-154.pdf

## 4c. Action-potential template functions  _(confidence: high)_

(a) van Dam/van Oosterom (ECGSIM lineage). L(t;τ,β)=1/(1+e^{-β(t-τ)}), maximum slope β/4 at t=τ. Depolarization D(t;δ)=L(t;δ,β). Repolarization R(t;ρ)=L(t;ρ,β1)·L(t;ρ,β2), as transcribed; R must be a decreasing function of t at ρ, so implement it with negative exponents/slopes. Source strength S(t;δ,ρ)=D(t;δ)R(t;ρ). β=2 ms^-1 gives a 50 mV/ms upstroke for a 100 mV swing. TMP runs from about -85 mV at rest to about +15 mV. ARI α=ρ-δ. β1 and β2 are fitted to the STT segment; no numbers given. Seven ECGSIM TMP parameters: depolarization time, repolarization time, resting potential, maximum amplitude, depolarization slope, plateau slope, repolarization slope. δ = time of maximum upstroke slope; ρ = inflection point of final repolarization. (b) Kloosterman 2023: normalized Vm(t)=(1+a·t)/(1+e^{R(t-Trep)}), with a giving a 5%, 10%, 20% or 40% decline at 200 ms (plateau slope). R is the sigmoid slope, fitted to the dominant T wave. Phase 0 omitted for T-wave work. (c) Mitchell-Schaeffer two-variable model (Ravon 2019): v'=h·v²(1-v)/τin - v/τout. h'=(1-h)/τopen if v<vgate, else -h/τclose. τin=0.3 ms, τout=6 ms, τopen=120 ms, τclose=150 ms, vgate=0.13. Vm=A·v(t-τ).

Sources:
- van Dam PM, van Oosterom A. Inverse imaging of electrical activity of a heart muscle. US Patent 8,838,203 B2 (Cortius Holding BV) https://patents.google.com/patent/US8838203B2/en
- van Dam PM, Oostendorp TF, van Oosterom A. ECGSIM: interactive simulation of the ECG for teaching and research purposes. Computing in Cardiology 2010;37:841-844 https://www.cinc.org/archives/2010/pdf/0841.pdf
- https://cinc.org/archives/2023/pdf/CinC2023-154.pdf
- Ravon G et al. Impact of the endocardium in a parameter optimization to solve the inverse problem of electrocardiography. Front Physiol 2019;9:1946 (PMC6349712) https://pmc.ncbi.nlm.nih.gov/articles/PMC6349712

## 5. Mechanical timing (to animate contraction in sync with the ECG)  _(confidence: medium)_

TDI M-mode normal values (n=974; women / men): IVCT (mitral closure → aortic opening) 36±13 / 34±11 ms. Ejection time (aortic opening → closure) 293±21 / 281±24 ms. IVRT (aortic closure → mitral opening) 92±20 / 94±20 ms. MPI 0.44 / 0.46. A search snippet from another population gives IVCT 40±10 (95% interval 20-59), LVET 292±23 (248-336), IVRT 96±19 (59-134) ms. LV tagged MRI (17 healthy; 14 ms resolution): onset of circumferential shortening spreads over only 35±9 ms (20-90% of LV); earliest in the lateral wall, latest in the septum. Peak shortening spreads over 121±22 ms in the opposite pattern (septum first). Post-systolic shortening in lateral/basal segments continues 58±14 ms after aortic valve closure, with circumferential shortening rising from 16.9% to 20.0%. Peak strain about 430 ms after QRS onset (Andrews 2019). Mechanical activation ≈ 1.06×electrical activation + 8.4 ms (R=0.95, animal MRI tagging). Atrial electromechanical delay, P onset → start of A' wave (healthy controls in an ASD study): PA-tricuspid 37.2±15.5, PA-septal 45.4±11.1, PA-lateral 59.7±12.5 ms. Atrial contraction therefore follows electrical activation by about 40-60 ms, RA before LA. ECG correspondence (LITFL): isovolumic contraction ≈ QRS/early ST; ejection ≈ ST-T; isovolumic relaxation begins at S2, around the end of T. Flashcard-level Wiggers figures (IVC 50, ejection 200, IVR 80, filling 520 ms) are low-confidence.

Sources:
- Biering-Sorensen T et al. Cardiac time intervals by tissue Doppler imaging M-mode: normal values... PLoS One 2016;11:e0153636 (PMC4836694) https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4836694/fullTextXML
- Zwanenburg JJM et al. Timing of cardiac contraction in humans mapped by high-temporal-resolution MRI tagging. Am J Physiol Heart Circ Physiol 2004;286:H1872. doi:10.1152/ajpheart.01047.2003 https://researchinformation.umcutrecht.nl/en/publications/timing-of-cardiac-contraction-in-humans-mapped-by-high-temporal-r/
- PMC7010071
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3559982/
- https://acikerisim.cumhuriyet.edu.tr/xmlui/handle/20.500.12418/8644
- https://partone.litfl.com/cardiac_cycle.html
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11946970/

## 6. Normal VCG (Frank) calibration targets for H(t)  _(confidence: high)_

Sur, Han & Tereshchenko 2013 (n=160, Frank XYZ). Men: spatial QRS peak 2.53±0.67 mV; T peak 0.80±0.25 mV; spatial peak QRS-T angle 56.8±33.9°; SVG 103.6±31.8 mV·ms, azimuth 11.7±26.8°, elevation 58.1±25.0°; QRS 98.0±7.5 ms; QTc 396±21 ms. Women: QRS 2.18±0.62 mV; T 0.60±0.24 mV; QRS-T 47.0±26.1°; SVG 83.5±29.2 mV·ms, azimuth -1.1±34.0°, elevation 49.1±26.0°; QRS 92.9±6.5 ms; QTc 410±24 ms. Convention: +X left, +Y down, +Z posterior. Azimuth 0° = left end of X, +90° = anterior end of Z. Elevation 0° = inferior end of Y. Japanese normal young subjects (search snippet): QRS spatial maximum 1.63±0.42 mV; T maximum 0.59±0.11 mV; QRS-T 27.3±15.1°. QRS long axis in the horizontal plane -29.5±25.6°, pointing backward. QRS half-area axis -11.4±20.8°. The 20 ms vector swings from right-anterior to left-anterior; the 50 ms vector is at 307±28° in the transverse plane. Scherptong 2008 (660 students, 12-lead→VCG via inverse Dower): QRS-T angle women 66±23° (normal 20-116), men 80±24° (30-130); SVG women 81±23 mV·ms, men 110±29 mV·ms. Medians: SVG men 107 (59-187), azimuth -24°, elevation 30°; women 79 (39-143), -15°, 28° (Leiden convention). Voulgari 2009 review: normal spatial QRS-T 0-90°; frontal direction +20° to +70°, within 10-20° of the frontal plane. The SVG lies along the anatomical long axis of the heart.

Sources:
- Sur S, Han L, Tereshchenko LG. PLoS One 2013;8:e57175 (PMC3579786) https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3579786/fullTextXML
- https://ousar.lib.okayama-u.ac.jp/en/journal/joma/79/11-12/article/18102
- Waks JW, Tereshchenko LG. Global electrical heterogeneity: a review of the spatial ventricular gradient. J Electrocardiol 2016 (PMC5159246) https://pmc.ncbi.nlm.nih.gov/articles/PMC5159246
- Scherptong RW et al. J Electrocardiol 2008;41:648 (via https://scholarlypublications.universiteitleiden.nl/access/item%3A2882075/view)
- Voulgari C, Tentolouris N. Curr Cardiol Rev 2009;5:251-262 (PMC2842956) https://pmc.ncbi.nlm.nih.gov/articles/PMC2842956/

## 6b. Clinical interval norms to check the synthetic 12-lead  _(confidence: medium)_

QRS >110 ms is abnormal above age 16 (≥100 ms age 4-16, ≥90 ms under 4) per AHA/ACCF/HRS 2009 Part III. PR 120-200 ms. P ≥120 ms = partial interatrial block; P ≥120 ms plus biphasic inferior P = advanced interatrial block. ECGSIM's normal male model has QRS 102 ms.

Sources:
- Surawicz B et al. AHA/ACCF/HRS Recommendations for the standardization and interpretation of the ECG, Part III. Circulation 2009;119:e235 https://hrsonline.org/guidance/clinical-resources/ahaaccfhrs-recommendations-standardization-and-interpretation-electrocardiogram-part-iii
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7877939
- https://pprd.cinc.org/archives/2011/pdf/0657.pdf

## 7. Forward formulas: dipole, lead vector, limb leads, WCT  _(confidence: high)_

Current dipole in an infinite homogeneous conductor: Φ = p·∇(1/r)/(4πσ) (Eq. 8.12), i.e. Φ = p·r̂/(4πσr²). Lead vector: Φ_P = c·p (Eq. 11.11); for an infinite medium c = r̂/(4πσr²). Einthoven: V_I = Φ_L-Φ_R, V_II = Φ_F-Φ_R, V_III = Φ_F-Φ_L (Eq. 15.1). Wilson central terminal V_CT = (Φ_R+Φ_L+Φ_F)/3 (Eq. 15.5). Goldberger aVF = Φ_F-(Φ_R+Φ_L)/2 (Eq. 15.7); aVR and aVL are analogous. Precordial positions: V1/V2 in the 4th intercostal space right/left of the sternum; V4 in the 5th intercostal space, midclavicular line; V3 midway between V2 and V4; V5 at V4 level, anterior axillary line; V6 at V4 level, midaxillary line. Order-of-magnitude check (derived): double-layer strength 8 μA/mm × 5000 mm² wavefront = 4e-5 A·m. At r = 0.1 m in σ = 0.2 S/m this gives Φ ≈ 1.6 mV, the right scale for a QRS peak.

Sources:
- https://www.bem.fi/book/08/08.htm
- https://www.bem.fi/book/11/11.htm
- https://www.bem.fi/book/15/15.htm

## 7b. Equivalent double layer (EDL) / ECGSIM method  _(confidence: high)_

The EDL places the whole atrial or ventricular source on the closed surface bounding the myocardium (epicardium, endocardium, base). Local source strength ∝ TMP Vm(t). Continuous form: φ(t,y) = ∫_Sv B(y,x)·Vm(t,x) dω(y,x). Discrete: ϕ(t,ℓ) = Σ_n B(ℓ,n)·S(t;δn,ρn), or Φ = A·S. Matrix sizes: ECGSIM v1 has N=257 heart nodes, L=198 thorax leads, 1 ms steps; v2 has about 1500 nodes per geometry and includes atria. Conductivities (patent): thorax and ventricular muscle 0.2 S/m, lungs 0.04 S/m, blood 0.6 S/m. During depolarization the EDL equals a uniform double layer on the wavefront (solid-angle theory). Depolarization-only step model: Vm = 0 before and 1 after δ. Double-layer strength 8 μA/mm, from a 40 mV step across the front × 0.2 S/m. Activation times come from the fastest-route algorithm: Dijkstra shortest path over node adjacency, travel time = edge length / velocity, first-come-first-served from foci at Purkinje terminals and bundle-branch insertions.

Sources:
- van Oosterom A, Oostendorp TF. ECGSIM: an interactive tool for studying the genesis of QRST waveforms. Heart 2004;90:165-168 (PMC1768085) https://pmc.ncbi.nlm.nih.gov/articles/PMC1768085
- https://patents.google.com/patent/US8838203B2/en
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9814485/
- van Dam PM, Oostendorp TF, van Oosterom A. Application of the fastest route algorithm in the interactive simulation of the effect of local ischemia on the ECG. Med Biol Eng Comput 2009;47:11-20 (described in https://pprd.cinc.org/archives/2011/pdf/0657.pdf)
- https://www.cinc.org/archives/2010/pdf/0841.pdf

## 7c. Solid-angle theory and simplified heart-to-torso forms  _(confidence: medium)_

Solid-angle theory: surface ST deviation ε = (Ω/4π)·ΔVm·K. Ω is the solid angle subtended at the electrode by the boundary of the ischemic region, ΔVm is the transmembrane-voltage difference across that boundary, and K corrects for intra/extracellular conductivity. Use this directly as the 'ST injury vector' term. Ravon 2019 simplified forward model (no torso matrix): φe(x_i,t) = (1/N_H)·Σ_k Vm(x_k,t) - Vm(x_i,t). φT(y,t) = Σ_i φe(x_i,t)/(4π‖x_i-y‖).

Sources:
- Holland RP, Brooks H. Solid-angle analysis of TQ-ST mapping, J Clin Invest https://www.jci.org/articles/view/108757
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6349712

## Recommendations

- Time base for one beat at about 75 bpm (800 ms), from P onset: SA node 0; RA 0-70 ms; LA starts about 20-30 ms and ends about 85-110 ms (P duration 80-110 ms; keep it under 120). AV node 50→125 ms; His 130; bundle branches 145; Purkinje 150; QRS onset about 160-175 ms, giving PR about 160 ms and HV about 45 ms. Ventricular activation lasts 80-100 ms. QT about 380-400 ms.
- Ventricular region activation times (ms after QRS onset), for 12-20 regions. LV mid-left septum, LV high anterior paraseptal and LV posterior paraseptal (1/3 from apex): 0-5 (Durrer). RV septum/anterior papillary muscle base: 5-10 (Durrer). Septum depolarizes left to right, finishing around 30-40 (unsourced). RV anterior free-wall epicardium: 18-24 (Ramanathan). LV apex/anterior/lateral endocardium: 10-30; epicardium 30-55 (unsourced). LV posterobasal and RVOT/pulmonary conus last, at 70-90 (unsourced). Better: derive these with a Dijkstra fastest-route pass over a region graph, using His/bundle 1.0-1.5 m/s, Purkinje 2-4 m/s, endocardial surface 1.0 m/s, epicardium 0.8 m/s, transmural 0.34-0.5 m/s. Calibrate until QRS is 90-100 ms.
- Repolarization: RT_n = AT_n + ARI_n with ARI about 235-240 ms at rest (in vivo). Add these gradients: apex→base +40 to +65 ms (RT later at base); endo minus epi RT about +30 ms (epi APD shortest); LV-RV RT about -8 ms. This gives an upright T concordant with QRS. Do NOT add a late-repolarizing midmural M-cell layer (Opthof 2017 found none in intact hearts); at most use a small mid-wall APD bump.
- AP template per region: S(t) = D(t;δ)·R(t;ρ) with D = 1/(1+e^{-2(t-δ)}) (t in ms), Vm from -85 to +15 mV. Give R a decreasing logistic at ρ, slope about 0.03-0.06 /ms (slope unsourced; fit to T width), times a linear plateau (1+a·(t-δ)) with a 5-20% decline at 200 ms (Kloosterman). Use the same function for the dipole computation and for the AP plot shown in the UI.
- Heart vector from the EDL (derived far-field approximation of φ = Σ B·S): H(t) ≈ k·Σ_n S_n(t)·A_n·n̂_n over closed-surface nodes or region patches (outward normals, area A_n). Equivalently, during QRS, H(t) = k'·Σ (wavefront area × normal) with double-layer strength 8 μA/mm. A uniform Vm over a closed surface correctly gives H=0. Then Φ_electrode = H·r̂/(4πσr²) with σ = 0.2 S/m; build leads I/II/III, aVR/aVL/aVF and V1-V6 relative to the Wilson central terminal.
- Calibrate global k so that, in Frank coordinates (+X left, +Y down, +Z posterior): |QRS|max ≈ 1.6-2.5 mV; |T|max ≈ 0.6-0.8 mV; spatial QRS-T angle ≈ 30-60° (upper normal limit 116-130°); frontal QRS axis about +20° to +70°; SVG about 80-105 mV·ms pointing along the anatomical long axis, slightly anterior. Initial 10-20 ms vector rightward/anterior (septal); mid-QRS (40-50 ms) leftward, inferior, posterior; terminal vector posterior/superior (basal).
- ST-injury add-on: H_ST = (ΔVm·K/4π)·(solid-angle-weighted boundary normal of the injured zone). Applied during the plateau (ST segment) and optionally as diastolic TQ shift, following Holland & Arnsdorf.
- Mechanics, per region: contraction onset = AT + 10-40 ms (mechanical ≈ 1.06·AT + 8.4 ms). LV onset spread about 35 ms; peak shortening spread about 120 ms. IVCT about 35 ms after the first mechanical onset; ejection about 285-295 ms; aortic valve closure near the end of T; IVRT about 92-96 ms. Atrial contraction starts 37-60 ms after P onset (RA first, LA lateral last), so atrial systole spans the PR segment.
- Use ECGSIM (www.ecgsim.org) as an external reference: compare your 12-lead and VCG against its normal male case (QRS 102 ms), and reproduce its LBBB demo (removing LV foci gives QRS 130 ms) and its Brugada demo (80% slower conduction in an 18 mm RVOT epicardial patch) for validation.

## Unsourced / design choices

- Durrer region-by-region times beyond the abstract are general knowledge, not fetched: full ventricular activation about 60-80 ms in the isolated heart; last activation (posterobasal LV and pulmonary conus/RVOT) around 60-80 ms; LV free-wall endocardium-to-epicardium transit about 20-35 ms (wall 10-12 mm at 0.34-0.5 m/s); RV wall about 10 ms.
- Fascicle anatomy: left anterior fascicle, left posterior fascicle, and a septal (median) fascicle whose endpoints match Durrer's three early LV sites. His bundle length about 10-20 mm. RBB is a thin cord to the moderator band / anterior papillary muscle.
- Textbook refractory ranges (Josephson-type EP normals, not confirmed): atrial ERP 170-300 ms, AV node ERP 230-425 ms, His-Purkinje ERP 330-450 ms, ventricular ERP 170-290 ms.
- AP phase shapes (general knowledge). Ventricular: rest -85 to -90 mV; overshoot +20 to +30 mV; phase 1 notch strongest in epicardium; plateau about 0 to +20 mV for about 150-200 ms; phase 3 to rest; dV/dt max about 200-300 V/s. Purkinje APD is longest (about 300-400 ms). Atrial AP is more triangular, APD90 about 200-300 ms at 1 Hz (no human number obtained; Pecha 2023 has n=320 but numbers not retrieved). SA/AV node: maximum diastolic potential about -60 mV, threshold about -40 mV, slow phase-0, phase-4 diastolic depolarization.
- VCG time course details: initial 10-20 ms septal vector anterior, rightward (superior or inferior); maximum vector at about 35-45 ms leftward/inferior/slightly posterior; terminal 60-80 ms vector posterior-superior. P loop maximum about 0.1-0.2 mV, frontal axis about +45° to +60°, anterior early (RA) then posterior/leftward late (LA). T loop roughly parallel to the QRS main vector, leftward/inferior/anterior. Only the 20 ms and 50 ms snippets and the peak magnitudes/angles were sourced.
- Hexaxial lead angles: I 0°, II +60°, III +120°, aVF +90°, aVL -30°, aVR -150°. Normal frontal QRS axis -30° to +90°. Normal P axis 0° to +75°.
- Wiggers phase durations (IVC 50, ejection 200-300, IVR 80, filling 520 ms) came only from flashcard-level sources. Ventricular electromechanical delay of about 20-50 ms (QRS onset to mitral closure) is general knowledge. The single-subject atrial EMD of 126 ms (P onset to A' peak) is anecdotal.
- Heart-dipole formula H(t) = -σ_i ∫ ∇Vm dV (bidomain impressed current, Geselowitz 1989 Proc IEEE 77:857; Miller & Geselowitz 1978 Circ Res 43:301) was not fetched. Its far-field EDL equivalent, H ≈ k Σ S_n A_n n̂_n, is my own derivation from the sourced EDL integral.
- Direction conflict: Ramanathan reports LV ARI longer than RV by 32 ms, while Kloosterman's EDL fit wants LV RT earlier than RV by about 8 ms. Treat the LV-RV gradient as a small tunable parameter (-10 to +30 ms).
- Recommended R-slope of the repolarization logistic (0.03-0.06 /ms) and the 10-40 ms per-region electromechanical offset are engineering guesses to be tuned against T-wave width and the IVCT/ET targets.
