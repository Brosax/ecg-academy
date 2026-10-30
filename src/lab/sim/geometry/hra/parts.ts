/**
 * HRA node names → roles. Heart: "Heart, Male" v1.3 (Browne & Schlehlein 2024, CC BY 4.0). Vessels: "Blood
 * Vasculature, Male" v1.3 (CC BY 4.0). Both share the Visible Human body frame (metres; +x patient left, +y superior,
 * +z anterior — the app frame orientation).
 */
import type { ModelCredit, OverlayMesh, ValveId } from '../../types';
import { CHAMBER } from '../../types';

export const HEART_FILE = '3d-vh-m-heart.glb';
export const VESSEL_FILE = '3d-vh-m-blood-vasculature.glb';

export const WALLS = {
  LV: 'VH_M_heart_left_ventricle',
  RV: 'VH_M_heart_right_ventricle',
  SEPTUM: 'VH_M_interventricular_septum',
  LA: 'VH_M_left_cardiac_atrium',
  RA: 'VH_M_right_cardiac_atrium',
} as const;

/** Papillary muscle → the ventricle whose tissue it becomes. */
export const PAPILLARY: readonly { readonly node: string; readonly chamber: number; readonly key: string }[] = [
  { node: 'VH_M_papillary_muscle_of_heart_anterior', chamber: CHAMBER.RV, key: 'rvAnterior' },
  { node: 'VH_M_papillary_muscle_of_heart_medial', chamber: CHAMBER.RV, key: 'rvMedial' },
  { node: 'VH_M_papillary_muscle_of_heart_posterior', chamber: CHAMBER.RV, key: 'rvPosterior' },
  { node: 'VH_M_papillary_muscle_of_heart_anterolateral', chamber: CHAMBER.LV, key: 'lvAnterolateral' },
  { node: 'VH_M_papillary_muscle_of_heart_posteromedial', chamber: CHAMBER.LV, key: 'lvPosteromedial' },
];

export const VALVE_NODES: Readonly<Record<ValveId, string>> = {
  MITRAL: 'VH_M_mitral_valve',
  TRICUSPID: 'VH_M_tricuspid_valve',
  AORTIC: 'VH_M_aortic_valve',
  PULMONARY: 'VH_M_pulmonary_valve',
};

export interface VesselSpec {
  readonly id: string;
  readonly kind: OverlayMesh['kind'];
  readonly nodes: readonly string[];
  /** Voxelized as solid Vessel where it lies inside the grid (great vessels plug the chamber openings). */
  readonly solid: boolean;
  /**
   * Overlay trimming in the BODY frame (mm): keep triangles whose centroid satisfies it. Long vessels are cut near the
   * heart (descending aorta, arch branches, IVC).
   */
  readonly keep?: (x: number, y: number, z: number) => boolean;
}

export const VESSELS: readonly VesselSpec[] = [
  {
    id: 'AORTA', kind: 'greatArtery', solid: true,
    nodes: [
      'VH_M_ascending_aorta', 'VH_M_aortic_arch', 'VH_M_descending_aorta_a',
      'VH_M_brachiocephalic_artery_a', 'VH_M_left_common_carotid_artery_a', 'VH_M_left_subclavian_artery_a',
    ],
    // descending aorta down to the level of the mid ventricles; arch branches as ≈ 15 mm stubs
    keep: (_x, y) => y > 455 && y < 585,
  },
  {
    id: 'PULMONARY_TRUNK', kind: 'greatArtery', solid: true,
    nodes: ['VH_M_pulmonary_trunk', 'VH_M_pulmonary_artery_L', 'VH_M_pulmonary_artery_R'],
  },
  { id: 'SVC', kind: 'greatVein', solid: true, nodes: ['VH_M_superior_vena_cava'] },
  { id: 'IVC', kind: 'greatVein', solid: true, nodes: ['VH_M_inferior_vena_cava_a', 'VH_M_inferior_vena_cava_b'], keep: (_x, y) => y > 405 },
  { id: 'PV_RI', kind: 'pulmonaryVein', solid: true, nodes: ['VH_M_pulmonary_vein_R_inf'] },
  { id: 'PV_RS', kind: 'pulmonaryVein', solid: true, nodes: ['VH_M_pulmonary_vein_R_sup'] },
  { id: 'PV_LI', kind: 'pulmonaryVein', solid: true, nodes: ['VH_M_pulmonary_vein_L_inf'] },
  { id: 'PV_LS', kind: 'pulmonaryVein', solid: true, nodes: ['VH_M_pulmonary_vein_L_sup'] },
  { id: 'LCA', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_left_coronary_artery'] },
  // the source metadata gives this node a wrong FMA id; the node name (LAD) is right
  { id: 'LAD', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_left_anterior_descending_artery'] },
  { id: 'DIAG1', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_diagonal_branch_of_anterior_descending_branch_of_left_coronary_artery'] },
  { id: 'DIAG2', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_diagonal_branch_of_left_anterior_descending_artery'] },
  { id: 'LCX_OM', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_left_marginal_branch'] },
  { id: 'RCA', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_right_coronary_artery'] },
  { id: 'RMARG', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_right_marginal_artery'] },
  { id: 'PDA', kind: 'coronaryArtery', solid: true, nodes: ['VH_M_right_posterior_descending_artery'] },
  { id: 'GCV', kind: 'cardiacVein', solid: true, nodes: ['VH_M_great_cardiac_vein'] },
  { id: 'MCV', kind: 'cardiacVein', solid: true, nodes: ['VH_M_middle_cardiac_vein'] },
  { id: 'SCV', kind: 'cardiacVein', solid: true, nodes: ['VH_M_small_cardiac_vein'] },
  { id: 'ACV', kind: 'cardiacVein', solid: true, nodes: ['VH_M_anterior_cardiac_vein'] },
  { id: 'PLV', kind: 'cardiacVein', solid: true, nodes: ['VH_M_posterior_vein_of_left_ventricle'] },
  { id: 'OBLIQUE_LA', kind: 'cardiacVein', solid: true, nodes: ['VH_M_oblique_vein_of_left_atrium'] },
  { id: 'CORONARY_SINUS', kind: 'cardiacVein', solid: true, nodes: ['VH_M_coronary_sinus'] },
];

export const HRA_CREDITS: readonly ModelCredit[] = [
  {
    title: 'HRA 3D Reference Organ — Heart, Male (VH_M_Heart) v1.3',
    authors: 'Browne K, Schlehlein H (Human Reference Atlas, HuBMAP)',
    url: 'https://doi.org/10.48539/HBM564.WKNG.249',
    license: 'CC BY 4.0',
  },
  {
    title: 'HRA 3D Reference Organ — Blood Vasculature, Male (VH_M_Blood_Vasculature) v1.3',
    authors: 'Human Reference Atlas 3D Reference Object Library (HuBMAP); creators as listed at the DOI',
    url: 'https://doi.org/10.48539/HBM473.XTPP.725',
    license: 'CC BY 4.0',
  },
];
