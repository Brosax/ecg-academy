/**
 * Canonical anatomical regions shared by the synthetic engine (which reports per-region activation state) and the small
 * 3D heart (which colours mesh zones by region). LV regions follow the AHA 17-segment model; the RV, atria and the
 * conduction system are added. Every synthetic scenario maps its internal sources onto these ids.
 */
import type { L10n } from './l10n';

const r = (id: string, group: RegionGroup, zh: string, en: string, es: string) => ({ id, group, name: { zh, en, es } }) as const;

export type RegionGroup = 'atria' | 'lv' | 'rv' | 'conduction';

export interface RegionDef {
  readonly id: string;
  readonly group: RegionGroup;
  readonly name: L10n;
}

export const REGION_LIST = [
  r('ra', 'atria', '右心房', 'Right atrium', 'Aurícula derecha'),
  r('la', 'atria', '左心房', 'Left atrium', 'Aurícula izquierda'),
  // LV — AHA 17 segments
  r('lv-basal-anterior', 'lv', '基底段前壁', 'Basal anterior', 'Anterior basal'),
  r('lv-basal-anteroseptal', 'lv', '基底段前间隔', 'Basal anteroseptal', 'Anteroseptal basal'),
  r('lv-basal-inferoseptal', 'lv', '基底段下间隔', 'Basal inferoseptal', 'Inferoseptal basal'),
  r('lv-basal-inferior', 'lv', '基底段下壁', 'Basal inferior', 'Inferior basal'),
  r('lv-basal-inferolateral', 'lv', '基底段下侧壁', 'Basal inferolateral', 'Inferolateral basal'),
  r('lv-basal-anterolateral', 'lv', '基底段前侧壁', 'Basal anterolateral', 'Anterolateral basal'),
  r('lv-mid-anterior', 'lv', '中段前壁', 'Mid anterior', 'Anterior medio'),
  r('lv-mid-anteroseptal', 'lv', '中段前间隔', 'Mid anteroseptal', 'Anteroseptal medio'),
  r('lv-mid-inferoseptal', 'lv', '中段下间隔', 'Mid inferoseptal', 'Inferoseptal medio'),
  r('lv-mid-inferior', 'lv', '中段下壁', 'Mid inferior', 'Inferior medio'),
  r('lv-mid-inferolateral', 'lv', '中段下侧壁', 'Mid inferolateral', 'Inferolateral medio'),
  r('lv-mid-anterolateral', 'lv', '中段前侧壁', 'Mid anterolateral', 'Anterolateral medio'),
  r('lv-apical-anterior', 'lv', '心尖段前壁', 'Apical anterior', 'Anterior apical'),
  r('lv-apical-septal', 'lv', '心尖段间隔', 'Apical septal', 'Septal apical'),
  r('lv-apical-inferior', 'lv', '心尖段下壁', 'Apical inferior', 'Inferior apical'),
  r('lv-apical-lateral', 'lv', '心尖段侧壁', 'Apical lateral', 'Lateral apical'),
  r('lv-apex', 'lv', '心尖', 'Apex', 'Ápex'),
  // RV
  r('rv-outflow', 'rv', '右心室流出道', 'RV outflow tract', 'Tracto de salida del VD'),
  r('rv-basal', 'rv', '右心室基底段游离壁', 'RV basal free wall', 'Pared libre basal del VD'),
  r('rv-mid', 'rv', '右心室中段游离壁', 'RV mid free wall', 'Pared libre media del VD'),
  r('rv-apical', 'rv', '右心室心尖段', 'RV apical', 'Ápex del VD'),
  // conduction system
  r('sa-node', 'conduction', '窦房结', 'Sinus node', 'Nodo sinusal'),
  r('av-node', 'conduction', '房室结', 'AV node', 'Nodo auriculoventricular'),
  r('his', 'conduction', '希氏束', 'Bundle of His', 'Haz de His'),
  r('rbb', 'conduction', '右束支', 'Right bundle branch', 'Rama derecha'),
  r('lbb', 'conduction', '左束支', 'Left bundle branch', 'Rama izquierda'),
  r('laf', 'conduction', '左前分支', 'Left anterior fascicle', 'Fascículo anterior izquierdo'),
  r('lpf', 'conduction', '左后分支', 'Left posterior fascicle', 'Fascículo posterior izquierdo'),
  r('purkinje', 'conduction', '浦肯野纤维', 'Purkinje network', 'Red de Purkinje'),
] as const;

export type RegionId = (typeof REGION_LIST)[number]['id'];

export const REGIONS: Readonly<Record<RegionId, RegionDef>> = Object.fromEntries(REGION_LIST.map((d) => [d.id, d])) as Record<
  RegionId,
  RegionDef
>;
