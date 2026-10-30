/**
 * Model-generated explanations (src/explain). Sentences are templates filled from the simulated heart vector, lead
 * vectors and model-truth timing — never per-lead hand-written text. Physiology: docs/research/activation-physiology.md,
 * docs/research/disease-spec.md (normal-sinus-rhythm).
 */
export const zh = {
  'dir.left': '左',
  'dir.right': '右',
  'dir.inferior': '下',
  'dir.superior': '上',
  'dir.anterior': '前',
  'dir.posterior': '后',
  'dir.join1': '{a}方',
  'dir.join2': '{a}{b}方',
  'dir.join3': '{a}{b}{c}方',
  'list.sep': '、',
  'sentence.sep': '',

  'ctx.P': 'P 波期间：窦房结发放冲动，心房自右向左去极化（P 波前段主要来自右房，后段来自左房）。',
  'ctx.PR': 'PR 段期间：冲动在房室结内缓慢传导（延迟），随后经 His 束、束支和浦肯野纤维快速下传；这些结构体积太小，体表心电图上基本看不到。',
  'ctx.QRS.early': 'QRS 早期：室间隔最先去极化，波前从左向右穿过间隔。',
  'ctx.QRS.mid': 'QRS 中期：心尖和左右心室游离壁由心内膜向心外膜去极化，左心室占优势。',
  'ctx.QRS.late': 'QRS 晚期：最后去极化的是左室后基底部和右室流出道。',
  'ctx.ST': 'ST 段期间：心室肌全部处于平台期，各处电位相近。',
  'ctx.T': 'T 波期间：心室复极，心外膜先于心内膜、心尖先于心底部复极。',
  'ctx.TP': 'TP 段期间：心房和心室都处于静息状态（电舒张期）。',
  'ctx.none': '此刻不在一个完整心动周期的已知分段内。',

  // short forms of ctx.* for the one-sentence caption under the heart (≤ 110 characters)
  'cap.P': 'P 波期间：窦房结发放冲动，心房自右向左去极化（P 波前段主要来自右房，后段来自左房）。',
  'cap.PR': 'PR 段期间：冲动在房室结内缓慢传导（延迟），随后经 His 束、束支和浦肯野纤维快速下传；这些结构体积太小，体表心电图上基本看不到。',
  'cap.QRS.early': 'QRS 早期：室间隔最先去极化，波前从左向右穿过间隔。',
  'cap.QRS.mid': 'QRS 中期：心尖和左右心室游离壁由心内膜向心外膜去极化，左心室占优势。',
  'cap.QRS.late': 'QRS 晚期：最后去极化的是左室后基底部和右室流出道。',
  'cap.ST': 'ST 段期间：心室肌全部处于平台期，各处电位相近。',
  'cap.T': 'T 波期间：心室复极，心外膜先于心内膜、心尖先于心底部复极。',
  'cap.TP': 'TP 段期间：心房和心室都处于静息状态（电舒张期）。',
  'cap.none': '此刻不在一个完整心动周期的已知分段内。',
  'active.list': '此刻参与的结构：{list}。',

  'h.zero': '心脏向量几乎为零（{mag} mV）：心肌内部没有明显的净电位差。',
  'h.dir': '心脏向量 H 指向{dirs}（额面角 {ang}，水平面角 {hang}），大小 {mag} mV。',
  'lead.axis.limb': '{lead} 导联轴（指向正极）朝向{dirs}（额面角 {ang}），灵敏度 |L| = {mag}。',
  'lead.axis.prec': '{lead} 导联轴（指向正极）朝向{dirs}（水平面角 {hang}），灵敏度 |L| = {mag}。',
  'proj': 'H 与导联轴的夹角为 {theta}° → 投影 = |H|·|L|·cos θ = {v} mV。',
  'iso.perp': 'H 几乎与该导联轴垂直，投影接近零。',
  'iso.small': '投影太小，在心电图上几乎看不出。',
  'iso.zero': '心脏向量为零时，所有导联都位于基线。',
  'defl.result': '→ {lead} 导联：{word}{wave}。',
  'word.up': '正向（向上）偏转',
  'word.down': '负向（向下）偏转',
  'word.iso': '接近等电位',
  'wave.is': '，即{name}',
  'wn.P': 'P 波',
  'wn.T': 'T 波',
  'wn.Q': 'Q 波',
  'wn.q': '小 q 波',
  'wn.R': 'R 波',
  'wn.r': '小 r 波',
  'wn.R2': 'R′ 波',
  'wn.r2': '小 r′ 波',
  'wn.S': 'S 波',
  'wn.s': '小 s 波',
  'wn.QS': 'QS 波',
  'angles.note': '角度约定：额面 0° = 左、+90° = 下；水平面 0° = 左、+90° = 前。',

  'segx.P':
    'P 波代表心房去极化。冲动起自上腔静脉与右房交界处的窦房结，先激动右房，再经 Bachmann 束传到左房，最后到达左心耳。平均心房向量指向左下方，所以 P 波在 I、II、aVF 直立，在 aVR 倒置，在 V1 常呈正负双向。',
  'segx.PR':
    'PR 段位于等电位线上：冲动在房室结内缓慢传导（约 0.02–0.05 m/s），让心房有时间收缩、把血液送入心室；随后冲动经 His 束、左右束支和浦肯野纤维快速下传（HV 间期约 35–55 ms）。这些传导组织体积太小，在体表心电图上不产生可见的波。',
  'segx.QRS':
    'QRS 波群代表心室去极化。最先激动的是室间隔左侧面，波前从左向右穿过间隔，向量指向右前方：所以 I、aVL、V5–V6 出现小 q 波，V1 出现小 r 波。随后心尖和左右心室游离壁由心内膜向心外膜去极化，左心室占优势，向量指向左下后方，形成 II、V5、V6 的主 R 波和 V1 的深 S 波。最后去极化的是左室后基底部和右室流出道，向量转向后上方，形成终末 s 波。',
  'segx.ST':
    'ST 段对应动作电位的平台期：全部心室肌都已去极化且电位接近，心肌之间没有净电位差，心脏向量接近零，所以 ST 段位于等电位线上。',
  'segx.T':
    'T 波代表心室复极。心外膜的动作电位比心内膜短，心尖比心底部短，所以复极从心外膜向心内膜推进，方向与去极化相反；复极波前的极性也与去极化相反，两次反向相互抵消，复极向量与去极化向量方向大致相同，因此正常 T 波与 QRS 主波方向一致（协调）。',
  'segx.TP':
    'TP 段是电舒张期：心房和心室都处于静息电位，没有电活动，是判断基线的最佳位置。机械上，心室先等容舒张，然后进入充盈期。',
  'segx.structs': '参与的结构：{list}。',
  'segx.dur': '本心搏中该段持续约 {ms} ms。',
  'segx.mech': '同期的机械活动：{list}。',

  'm.p': 'P 波{shape}（峰值 {peak} mV）：平均心房向量指向{dirs}，与本导联轴夹角 {theta}°。',
  'm.qrs':
    'QRS 呈 {pattern} 型，以{main}为主：平均 QRS 向量指向{dirs}（额面角 {ang}），与本导联轴夹角 {theta}°（夹角 < 90° 为正向，> 90° 为负向）。',
  'm.t': 'T 波{shape}（峰值 {peak} mV），{conc}；空间 QRS-T 夹角 {qrst}°。',
  'm.none': '尚无完整的心动周期可供分析。',
  'shape.up': '直立',
  'shape.down': '倒置',
  'shape.biphasic': '双向',
  'shape.flat': '低平',
  'main.pos': '正向波',
  'main.neg': '负向波',
  'main.equi': '正负相当（双相）',
  'conc.yes': '与 QRS 主波方向一致（协调）',
  'conc.no': '与 QRS 主波方向相反（不协调）',
  'conc.na': 'QRS 正负相当，无法判断协调性',
} as const;
export type ExplainKey = keyof typeof zh;
