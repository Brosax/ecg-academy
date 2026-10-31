/**
 * The nine scenes of docs/design/f-explainers.md §4 as the tests pin them: id, PascalCase component name, lesson and
 * the narration beat ids in order. Not a test file (no .test.ts); shared by registry.test.ts, strings.test.ts and
 * tests/figures/scenes/<id>.test.ts. Changing a beat list here is a spec change, not a scene edit.
 */
export interface SceneSpec {
  readonly id: string;
  readonly pascal: string;
  readonly lesson: 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6';
  readonly beats: readonly string[];
  /** needs the block's ECG (cursor bridge, window) */
  readonly ecgBacked: boolean;
  /** has a Predict row (pq_* keys) */
  readonly predict: boolean;
}

export const SCENE_SPECS: readonly SceneSpec[] = [
  { id: 'conduction-journey', pascal: 'ConductionJourney', lesson: 'f1', beats: ['p', 'av', 'his', 'qrs', 'st', 't'], ecgBacked: true, predict: false },
  { id: 'vector-pen', pascal: 'VectorPen', lesson: 'f2', beats: ['sum', 'drop', 'draw', 'turn', 't'], ecgBacked: false, predict: true },
  { id: 'three-vectors', pascal: 'ThreeVectors', lesson: 'f2', beats: ['look', 'septum', 'walls', 'bases', 'row'], ecgBacked: false, predict: false },
  { id: 'triangle-to-wheel', pascal: 'TriangleToWheel', lesson: 'f3', beats: ['potentials', 'difference', 'law', 'slide', 'augment', 'project'], ecgBacked: true, predict: false },
  { id: 'chest-ring', pascal: 'ChestRing', lesson: 'f3', beats: ['wct', 'one', 'walk', 'transition', 'groups'], ecgBacked: false, predict: true },
  { id: 'moving-paper', pascal: 'MovingPaper', lesson: 'f4', beats: ['pulse', 'second', 'rr', 'speed', 'gain'], ecgBacked: true, predict: true },
  { id: 'electrode-walk', pascal: 'ElectrodeWalk', lesson: 'f5', beats: ['count', 'level', 'walk', 'swap', 'extra'], ecgBacked: true, predict: false },
  { id: 'cable-swap', pascal: 'CableSwap', lesson: 'f6', beats: ['potentials', 'laRa', 'wct', 'raRl'], ecgBacked: true, predict: true },
  { id: 'noisy-electrode', pascal: 'NoisyElectrode', lesson: 'f6', beats: ['shake', 'find', 'move', 'heart'], ecgBacked: true, predict: true },
];

export const specOf = (id: string): SceneSpec => {
  const s = SCENE_SPECS.find((x) => x.id === id);
  if (!s) throw new Error(`no scene spec for ${id}`);
  return s;
};

/** The shape every src/figures/scenes/<id>.i18n.ts module exports. */
export interface SceneI18nModule {
  readonly BEAT_IDS: readonly string[];
  readonly zh: Readonly<Record<string, string>>;
  readonly en: Readonly<Record<string, string>>;
  readonly es: Readonly<Record<string, string>>;
}
