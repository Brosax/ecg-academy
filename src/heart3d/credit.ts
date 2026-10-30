/**
 * Attribution of the 3D heart model (CC BY 4.0 requires credit, a licence link and an indication of the changes made).
 * Exported as HEART_CREDIT for the About page; the same facts are stored in the header of src/assets/heart.bin
 * (`credit`, `changes`) by scripts/bake-heart.mjs.
 */
import type { L10n } from '../core/l10n';

const SOURCE: L10n = {
  zh:
    '三维心脏改编自人类参考图谱（Human Reference Atlas，HuBMAP）三维参考器官“男性心脏”（VH_M_Heart）v1.3，' +
    '作者 Browne K、Schlehlein H，基于美国国家医学图书馆 Visible Human Project 男性数据，DOI 10.48539/HBM564.WKNG.249，' +
    '采用知识共享署名 4.0 国际许可协议（CC BY 4.0）。',
  en:
    'The 3D heart is adapted from the Human Reference Atlas (HuBMAP) 3D Reference Organ "Heart, Male" (VH_M_Heart) v1.3 ' +
    'by Browne K and Schlehlein H, built from the Visible Human Project male data (U.S. National Library of Medicine), ' +
    'DOI 10.48539/HBM564.WKNG.249, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).',
  es:
    'El corazón 3D está adaptado del órgano de referencia 3D «Heart, Male» (VH_M_Heart) v1.3 del Human Reference Atlas (HuBMAP), ' +
    'de Browne K y Schlehlein H, elaborado con los datos masculinos del Visible Human Project (Biblioteca Nacional de Medicina de EE. UU.), ' +
    'DOI 10.48539/HBM564.WKNG.249, con licencia Creative Commons Atribución 4.0 Internacional (CC BY 4.0).',
};

const CHANGES: L10n = {
  zh:
    '修改内容：仅保留左、右心室、室间隔及左、右心房心肌（瓣膜与乳头肌仅用作定位标志，不随应用分发）；' +
    '合并重复顶点，换算为毫米并以心室质心为原点（保留身体方位）；以顶点聚类简化至约 2 万个三角形；' +
    '为每个顶点标注解剖区域（左心室 AHA 17 节段、右心室流出道及基底/中/心尖段游离壁、左右心房）；' +
    '另加升主动脉和肺动脉干的短段以便定位；传导系统（窦房结、房室结、希氏束、左右束支、分支及浦肯野纤维）由本应用示意性绘制，不属于原始模型。',
  en:
    'Changes: kept only the myocardium of the left and right ventricles, interventricular septum and left and right atria ' +
    '(valves and papillary muscles were used as landmarks only and are not distributed); welded duplicate vertices, converted to millimetres ' +
    'with the ventricular centroid as origin (body orientation kept); decimated by vertex clustering to about 20,000 triangles; ' +
    'labelled every vertex with an anatomical region (AHA 17-segment left ventricle, right-ventricular outflow tract and basal/mid/apical free wall, ' +
    'right and left atria); added short stubs of the ascending aorta and pulmonary trunk for orientation; the conduction system ' +
    '(sinus node, AV node, His bundle, bundle branches, fascicles and Purkinje fibres) is drawn schematically by this app and is not part of the source model.',
  es:
    'Cambios: se conserva solo el miocardio de los ventrículos izquierdo y derecho, el tabique interventricular y las aurículas izquierda y derecha ' +
    '(las válvulas y los músculos papilares solo se usaron como referencias anatómicas y no se distribuyen); se fusionaron vértices duplicados, ' +
    'se pasó a milímetros con el centroide ventricular como origen (se mantiene la orientación corporal); se simplificó por agrupación de vértices ' +
    'a unos 20 000 triángulos; cada vértice se etiquetó con una región anatómica (17 segmentos AHA del ventrículo izquierdo, tracto de salida ' +
    'y pared libre basal/media/apical del ventrículo derecho, aurículas derecha e izquierda); se añadieron segmentos cortos de la aorta ascendente ' +
    'y del tronco pulmonar para orientarse; el sistema de conducción (nodo sinusal, nodo AV, haz de His, ramas, fascículos y fibras de Purkinje) ' +
    'lo dibuja esta aplicación de forma esquemática y no forma parte del modelo original.',
};

export const HEART_CREDIT = {
  title: 'HRA 3D Reference Organ — Heart, Male (VH_M_Heart) v1.3',
  creators: 'Browne K, Schlehlein H (Human Reference Atlas, HuBMAP); Visible Human Project male data (U.S. National Library of Medicine)',
  doi: 'https://doi.org/10.48539/HBM564.WKNG.249',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  /** source + licence sentence */
  source: SOURCE,
  /** changes made (CC BY "indicate if changes were made") */
  changes: CHANGES,
  /** source and changes in one paragraph */
  text: {
    zh: `${SOURCE.zh}${CHANGES.zh}`,
    en: `${SOURCE.en} ${CHANGES.en}`,
    es: `${SOURCE.es} ${CHANGES.es}`,
  } satisfies L10n,
  /** plain hyperlinks for the About page (nothing is fetched at runtime) */
  links: [
    { label: 'HRA VH_M_Heart v1.3', href: 'https://doi.org/10.48539/HBM564.WKNG.249' },
    { label: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' },
  ],
} as const;

export type HeartCredit = typeof HEART_CREDIT;
