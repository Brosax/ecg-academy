import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { BASICS_SOURCES, FOUNDATION_BASICS } from './basics';
import { HeartIntroduction } from './HeartIntroduction';

export function FoundationsBasics({ lessonId, onFinish }: { lessonId: string; onFinish: () => void }) {
  const pages = FOUNDATION_BASICS[lessonId];
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusPending = useRef(false);
  const focusConcept = () => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  useLayoutEffect(() => {
    if (focusPending.current) { focusPending.current=false; focusConcept(); }
  }, [index]);
  if (!pages) return null;
  const current = pages[index];
  const change = (next: number) => {
    if (next === index) { focusConcept(); return; }
    focusPending.current = true;
    setIndex(next);
  };
  return <section class="fd-basics" aria-label={lt(l('零基础讲解', 'Start from the basics', 'Empieza desde cero'))}>
    <div class="fd-basics-top"><p>{lt(l('不需要预先懂解剖或心电图。我们一次只认识一个概念。', 'No anatomy or ECG knowledge is assumed. Take one concept at a time.', 'No necesitas conocimientos previos de anatomía ni ECG. Avanza concepto a concepto.'))}</p><button type="button" class="fd-textbutton" onClick={onFinish}>{lt(l('已经了解，直接看图', 'I know this — go to the ECG', 'Ya lo conozco: ver el ECG'))}</button></div>
    <nav class="fd-basics-nav" aria-label={lt(l('入门讲解内容', 'Introductory concepts', 'Conceptos iniciales'))}>{pages.map((p, i) => <button type="button" class={i === index ? 'is-current' : ''} aria-current={i === index ? 'step' : undefined} onClick={() => change(i)}><span>{i+1}</span>{lt(p.title)}</button>)}</nav>
    <article class="fd-basics-page">
      <p class="fd-eyebrow">{lt(l('先弄明白', 'UNDERSTAND FIRST', 'COMPRENDE PRIMERO'))} · {index+1} / {pages.length}</p>
      <h3 ref={heading} tabIndex={-1}>{lt(current.title)}</h3>
      {current.heart && <HeartIntroduction mode={current.heart}/>}
      {current.anatomy && <details class="fd-heart-flat"><summary>{lt(l('对照二维关系图','Compare the relationship diagram','Comparar con el esquema'))}</summary><div class="fd-basic-heart" role="group" aria-label={lt(l('四个心腔，患者右侧在画面左侧', 'Four chambers, patient right on your left', 'Cuatro cavidades, la derecha del paciente a tu izquierda'))}>
        <p>{lt(l('患者右侧', 'Patient’s right', 'Derecha del paciente'))}</p><p>{lt(l('患者左侧', 'Patient’s left', 'Izquierda del paciente'))}</p>
        <div><strong>{lt(l('右心房', 'Right atrium', 'Aurícula derecha'))}</strong><span>{lt(l('接收身体回流', 'Receives from body', 'Recibe del cuerpo'))}</span></div><div><strong>{lt(l('左心房', 'Left atrium', 'Aurícula izquierda'))}</strong><span>{lt(l('接收肺部回流', 'Receives from lungs', 'Recibe de los pulmones'))}</span></div>
        <span aria-hidden="true">↓</span><span aria-hidden="true">↓</span>
        <div><strong>{lt(l('右心室', 'Right ventricle', 'Ventrículo derecho'))}</strong><span>{lt(l('泵向肺部', 'Pumps to lungs', 'Bombea a los pulmones'))}</span></div><div><strong>{lt(l('左心室', 'Left ventricle', 'Ventrículo izquierdo'))}</strong><span>{lt(l('泵向全身', 'Pumps to body', 'Bombea al cuerpo'))}</span></div>
        <small>{lt(l('功能示意，不表示真实解剖形状或血流速度。', 'Functional diagram, not anatomical shape or flow speed.', 'Esquema funcional, no representa la forma anatómica ni la velocidad del flujo.'))}</small>
      </div></details>}
      <div class="fd-basics-prose">{current.paragraphs.map(text => <p>{lt(text)}</p>)}</div>
      <ol class="fd-basic-sequence" aria-label={lt(l('把关系连起来', 'Connect the ideas', 'Relaciona las ideas'))}>{current.sequence.map(text => <li>{lt(text)}</li>)}</ol>
      <aside class="fd-basic-takeaway"><strong>{lt(l('现在只需记住', 'For now, remember', 'Por ahora, recuerda'))}</strong><p>{lt(current.takeaway)}</p></aside>
    </article>
    <div class="fd-basics-controls"><button type="button" class="fd-choice" disabled={index === 0} onClick={() => change(index-1)}>{lt(l('上一个概念', 'Previous concept', 'Concepto anterior'))}</button><button type="button" class="fd-next" onClick={() => index === pages.length-1 ? onFinish() : change(index+1)}>{lt(index === pages.length-1 ? l('带着这些概念看图', 'Now look at the ECG', 'Ahora mira el ECG') : l('继续认识下一个概念', 'Learn the next concept', 'Aprende el siguiente concepto'))}</button></div>
    <details class="fd-basic-sources"><summary>{lt(l('入门讲解参考资料', 'Introductory references', 'Referencias introductorias'))}</summary><ul>{BASICS_SOURCES.map(s => <li><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul></details>
  </section>;
}
