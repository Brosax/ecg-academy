/** Guided tour text. Numbers: docs/research/activation-physiology.md (§1, §1b, §2, §2b, §3b, §5). */
export const zh = {
  'tour.title': '引导讲解：一次心跳的十步',
  'tour.intro': '从窦房结发放冲动到舒张期，分十步讲解一次心跳。每一步会自动设置剖面、高亮相关结构、选择重点导联，并慢放一次对应的时间段，播完停在最后一帧。',
  'tour.start': '开始讲解',
  'tour.exit': '退出讲解',
  'tour.prev': '上一步',
  'tour.next': '下一步',
  'tour.finish': '完成',
  'tour.progress': '第 {n} / {total} 步',
  'tour.dots': '讲解进度',
  'tour.goto': '跳到第 {n} 步：{title}',
  'tour.loop': '正在以 {speed}× 慢放这一段（{ms} ms），播完会停在最后一帧',
  'tour.ended': '已停在这一段的最后一帧（{ms} ms）',
  'tour.looping': '自动循环中：以 {speed}× 慢放（{ms} ms），每轮结束停顿 1.5 秒',
  'tour.replay': '重播这一步',
  'tour.autoLoop': '自动循环',
  'tour.keyMoment': '本步关键时刻的模型解释（暂停后显示当前时刻）',
  'tour.lead': '重点导联：{lead}',
  'tour.keys': '讲解面板获得焦点时，可用 ← / → 切换步骤，Esc 退出。',
  'tour.live': '此刻的模型解释',
  'tour.unavailable': '当前心动周期缺少这一段的模型数据，请先播放几秒再试。',

  'step.sa.title': '1. 窦房结发放冲动',
  'step.sa.body':
    '每次心跳都从窦房结开始。它位于上腔静脉与右心房交界处的界沟内，细胞能自动去极化。窦房结本身太小，体表心电图上看不到它的放电——放电发生在 P 波起点之前。观察 3D 中右心房的顶部：冲动从这里出发。',
  'step.atria.title': '2. 心房去极化 = P 波',
  'step.atria.body':
    '冲动在心房肌中以约 0.8–1.0 m/s 传播：先激动右房，再经 Bachmann 束到达左房，最后到达左心耳，全程约 80–110 ms。P 波前段主要来自右房，后段来自左房。平均心房向量指向左下方，所以 II 导联的 P 波直立。约 40–60 ms 后心房开始收缩。',
  'step.avDelay.title': '3. 房室结延迟 = PR 段',
  'step.avDelay.body':
    '房室之间的纤维环是电绝缘的，位于 Koch 三角顶点的房室结是冲动进入心室的唯一通道。房室结传导很慢（约 0.02–0.05 m/s），产生约 50–120 ms 的延迟（AH 间期），让心房收缩把血液送入心室。房室结细胞数量很少，所以体表心电图上这一段是平的。',
  'step.hisPurkinje.title': '4. His 束、束支与浦肯野纤维',
  'step.hisPurkinje.body':
    '冲动穿过中心纤维体进入 His 束，然后分成左束支（再分为前、后和间隔支）和右束支（经调节束到达前乳头肌），最后进入心内膜下的浦肯野网（2–4 m/s）。从 His 束到心室肌约需 35–55 ms（HV 间期）。这些纤维同样太细，所以 PR 段仍在等电位线上。',
  'step.septum.title': '5. 室间隔最先激动 = QRS 起始',
  'step.septum.body':
    '左束支的分支最早到达室间隔左侧面的中部，所以室间隔从左向右去极化，向量指向右前方。它在 V1 形成小 r 波，在 I、aVL、V5、V6 形成小 q 波（"间隔 q 波"）。观察短轴切面：波前从左室一侧穿过室间隔。',
  'step.apexFreeWalls.title': '6. 心尖与游离壁 = 主波',
  'step.apexFreeWalls.body':
    '浦肯野网让心尖和左右心室游离壁几乎同时由心内膜向心外膜去极化。左心室壁更厚，占优势，向量指向左下后方，在 II、V5、V6 形成高大的 R 波，在 V1 形成深 S 波。右室心外膜在 QRS 开始后约 20–25 ms 最先被突破。约在此时二尖瓣和三尖瓣关闭（第一心音），心室进入等容收缩期。',
  'step.baseRvot.title': '7. 心底部与右室流出道 = 终末波',
  'step.baseRvot.body':
    '浦肯野纤维覆盖不到的左室后基底部和右室流出道最后激动（QRS 开始后约 60–90 ms）。此时剩余的向量较小，转向后上方，在 I、V5、V6 形成小的终末 s 波。之后全部心室肌都已去极化，QRS 结束。',
  'step.plateau.title': '8. 平台期 = ST 段',
  'step.plateau.body':
    '心室肌细胞处于动作电位平台期：全部都已去极化且电位相近，心肌之间没有净电位差，心脏向量接近零，所以 ST 段位于等电位线上。机械上，主动脉瓣和肺动脉瓣已经开放，心室正在射血。ST 段偏离基线是心肌损伤的重要线索。',
  'step.repolarization.title': '9. 心室复极 = T 波',
  'step.repolarization.body':
    '心外膜的动作电位比心内膜短，心尖比心底部短，所以复极从心外膜向心内膜、从心尖向心底部推进。复极的传播方向和波前极性都与去极化相反，两次反向相互抵消，因此正常 T 波与 QRS 主波方向一致。T 波结束前后主动脉瓣关闭（第二心音）。',
  'step.diastole.title': '10. 舒张期 = TP 段',
  'step.diastole.body':
    '心房和心室都回到静息电位，没有电活动，TP 段是判断基线的最佳位置。机械上，心室先等容舒张，然后二尖瓣和三尖瓣开放，血液充盈心室，直到窦房结再次发放冲动。',
} as const;
export type TourKey = keyof typeof zh;
