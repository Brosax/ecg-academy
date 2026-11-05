import { useEffect, useRef, useState } from 'preact/hooks';
import { go, href } from '../../app/router';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { tco } from '../../i18n/course';
import { Icon } from '../../ui';
import type { Lesson } from '../api';
import { BlockView } from '../blocks';
import { getLessonProgress, progressTick, setLessonProgress } from '../deps';
import { progressAfterFinish, progressAfterVisit, resumeStep } from '../stages';
import { foundationChapters, foundationChapterAt, foundationEntryStep, presentationProgress } from './presentation';
import { StoryTheatre } from './StoryTheatre';
import { FoundationsBasics } from './FoundationsBasics';
import './foundations.css';

/** Story presentation is an adapter. Legacy block coordinates remain the persisted contract. */
export function FoundationsLessonPlayer({ lesson, step }: { lesson: Lesson; step?: number }) {
  void progressTick();
  const resume = resumeStep(getLessonProgress(lesson.id), lesson.blocks.length);
  const legacy = foundationEntryStep(lesson, step, resume);
  const chapters = foundationChapters(lesson);
  const chapterIndex = foundationChapterAt(lesson, legacy);
  const chapter = chapters[chapterIndex];
  const blockOffset = Math.max(0, chapter.legacySteps.indexOf(legacy));
  const blockIndex = chapter.legacySteps[blockOffset]-1;
  const [storyReady, setStoryReady] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questionReady, setQuestionReady] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const prevChapter = useRef(chapter.id);
  const progress = presentationProgress(lesson, getLessonProgress(lesson.id));
  useEffect(() => {
    if (step !== legacy) go({ name:'lesson',id:lesson.id,step:legacy }, true);
  }, [lesson.id, step, legacy]);
  useEffect(() => {
    if (chapter.id !== 'story') return;
    const frame = requestAnimationFrame(() => stage.current?.scrollIntoView({block:'start'}));
    return () => cancelAnimationFrame(frame);
  }, [chapter.id]);
  useEffect(() => {
    setLessonProgress(lesson.id, progressAfterVisit(getLessonProgress(lesson.id), legacy, Date.now()));
    if (prevChapter.current !== chapter.id) { setStoryReady(false); stage.current?.focus({preventScroll:true}); if ((stage.current?.getBoundingClientRect().top ?? 0) < 50) stage.current?.scrollIntoView({block:'start'}); }
    prevChapter.current = chapter.id;
  }, [legacy, chapter.id, step]);
  const navigate = (index: number) => go({name:'lesson',id:lesson.id,step:chapters[index].step});
  const finish = () => { setLessonProgress(lesson.id, progressAfterFinish(lesson.blocks.length, Date.now())); setFinished(true); };
  const lastBlock = blockOffset >= chapter.legacySteps.length-1;
  const introActive = chapter.id === 'question' && !questionReady;
  const finishIntro = () => {
    setQuestionReady(true);
    requestAnimationFrame(() => { stage.current?.focus({preventScroll:true}); stage.current?.scrollIntoView({block:'start'}); });
  };
  const support = chapters.find(c => c.id === 'story')?.legacySteps.filter(s => !['heart','figure'].includes(lesson.blocks[s-1].kind)) ?? [];
  return <div class="foundations-player">
    <header class="fd-coursehead"><div class="fd-course-meta"><a href={href({name:'learn'})}><Icon name="prev" size={14}/>{lt(l('基础课程', 'FOUNDATIONS', 'FUNDAMENTOS'))}</a><span>{lesson.id.toUpperCase()} / 06</span><span class="fd-course-progress">{getLessonProgress(lesson.id)?.done ? lt(l('已完成','Completed','Completada')) : `${Math.round(progress.fraction*100)}%`}</span></div><h1>{lt(lesson.title)}</h1><details class="fd-objectives"><summary>{lt(l('学习目标与课程说明','Learning goals & overview','Objetivos y descripción'))}</summary><p>{lt(lesson.summary)}</p><ul>{lesson.objectives.map(o=><li>{lt(o)}</li>)}</ul></details></header>
    <nav class="fd-chapters" aria-label={lt(l('课程章节','Lesson chapters','Capítulos de la lección'))}>{chapters.map((c,i)=><a key={c.id} href={href({name:'lesson',id:lesson.id,step:c.step})} aria-current={i === chapterIndex ? 'step' : undefined}><span>{String(i+1).padStart(2,'0')}</span>{lt(c.title)}</a>)}</nav>
    <div class="fd-stage" ref={stage} tabIndex={-1}>
      {chapter.id === 'story' ? <StoryTheatre key={lesson.id} lesson={lesson} onComplete={setStoryReady}/> : <section class="fd-content-chapter" aria-labelledby="fd-chapter-title"><header><p class="fd-eyebrow">{lt(chapter.description)}</p><h2 id="fd-chapter-title">{lt(chapter.title)}</h2>{chapter.legacySteps.length>1 && <div class="fd-content-steps" aria-label={lt(l('本章内容','Chapter contents','Contenido del capítulo'))}>{chapter.legacySteps.map((s,i)=><a href={href({name:'lesson',id:lesson.id,step:s})} aria-current={i === blockOffset ? 'step' : undefined}>{i+1}</a>)}</div>}</header>{introActive ? <FoundationsBasics lessonId={lesson.id} onFinish={finishIntro}/> : <>{chapter.id==='question' && <button type="button" class="fd-textbutton fd-basics-link" onClick={()=>setQuestionReady(false)}>{lt(l('回看入门概念','Review the basics','Repasar los conceptos básicos'))}</button>}<div class="fd-original-block" key={blockIndex}><BlockView block={lesson.blocks[blockIndex]} lesson={lesson} index={blockIndex}/></div></>}</section>}
    </div>
    <div class="fd-chapternav"><button type="button" class="fd-textbutton" disabled={chapterIndex===0 && blockOffset===0} onClick={()=>blockOffset>0 && chapter.id!=='story' ? go({name:'lesson',id:lesson.id,step:chapter.legacySteps[blockOffset-1]}) : navigate(chapterIndex-1)}><Icon name="prev" size={16}/>{lt(l('返回','Back','Volver'))}</button><span class="fd-muted">{lt(chapter.title)}</span>{chapter.id==='summary' && lastBlock ? <button class="fd-next" type="button" onClick={finish}>{lt(l('完成本课','Finish lesson','Completar lección'))}<Icon name="check" size={16}/></button> : <button type="button" class="fd-next" disabled={introActive || (chapter.id==='story' && !storyReady)} onClick={()=>chapter.id!=='story' && !lastBlock ? go({name:'lesson',id:lesson.id,step:chapter.legacySteps[blockOffset+1]}) : navigate(chapterIndex+1)}>{lt(l('继续学习','Continue learning','Seguir aprendiendo'))}<Icon name="next" size={16}/></button>}</div>
    {finished && <div class="fd-complete" role="status"><Icon name="check"/><p>{lt(l('这一课已完成。带着刚才的观察，继续下一段旅程。','Lesson complete. Take what you observed into the next lesson.','Lección completada. Lleva lo observado a la siguiente lección.'))}</p><a class="fd-choice" href={href({name:'lesson',id:lesson.id==='f6'?'s1':`f${Number(lesson.id.slice(1))+1}`})}>{lt(l('进入下一课','Next lesson','Siguiente lección'))}</a></div>}
    {chapter.id==='story' && support.length>0 && <details class="fd-support"><summary>{lt(l('延伸阅读、数值与对比实例','Further reading, values & comparisons','Ampliación, valores y comparaciones'))}</summary>{support.map(s=><div class="fd-support-block" key={s}><BlockView block={lesson.blocks[s-1]} lesson={lesson} index={s-1}/></div>)}</details>}
    <footer class="fd-coursefooter"><a href={href({name:'learn'})}>{lt(l('返回课程地图','Back to course map','Volver al mapa del curso'))}</a><details><summary>{tco('sources')}</summary><ul>{lesson.sources.map(s=><li>{s}</li>)}</ul></details></footer>
  </div>;
}
