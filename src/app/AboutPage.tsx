/**
 * About: what the app is, where its ECGs come from (one-source synthetic model vs real PTB-XL recordings), references,
 * data and licences, disclaimer and privacy. Body text lives in content.ts (inline zh/en/es); citations keep their
 * original language. External links are plain hyperlinks (nothing is loaded from the network).
 */
import type { ComponentChildren } from 'preact';
import { lt } from '../i18n';
import { tsh } from '../i18n/shell';
import { Badge, Icon } from '../ui';
import { ABOUT, CITATIONS, LINKS } from './content';
import { LAB_MODEL_CREDITS } from '../lab';
import './pages.css';

export function AboutPage() {
  return (
    <div class="app-page about">
      <header class="app-pagehead">
        <h1>{tsh('aboutTitle')}</h1>
        <p>{tsh('aboutLead')}</p>
      </header>

      <section class="about-section" aria-labelledby="about-what">
        <h2 id="about-what" class="about-h2">
          {tsh('aboutWhat')}
        </h2>
        <p class="about-prose">{lt(ABOUT.what)}</p>
      </section>

      <section class="about-section" aria-labelledby="about-how">
        <h2 id="about-how" class="about-h2">
          {tsh('aboutHow')}
        </h2>
        <div class="about-sources">
          <article class="about-source about-source--synth" aria-labelledby="about-synth">
            <div class="about-source__head">
              <h3 id="about-synth">{tsh('aboutSynth')}</h3>
              <Badge tone="info">{tsh('aboutSynthTag')}</Badge>
            </div>
            <OneSourceDiagram />
            <p>{lt(ABOUT.synth)}</p>
            <p class="about-grading">
              <strong>{tsh('aboutGrading')}:</strong> {tsh('aboutGradingSynth')}
            </p>
          </article>
          <article class="about-source about-source--real" aria-labelledby="about-real">
            <div class="about-source__head">
              <h3 id="about-real">{tsh('aboutReal')}</h3>
              <Badge tone="ok">{tsh('aboutRealTag')}</Badge>
            </div>
            <p>{lt(ABOUT.real)}</p>
            <p class="about-small">{lt(ABOUT.realChanges)}</p>
            <p class="about-grading">
              <strong>{tsh('aboutGrading')}:</strong> {tsh('aboutGradingReal')}
            </p>
          </article>
        </div>
        <div class="about-heart">
          <h3>{tsh('aboutHeart')}</h3>
          <p>{lt(ABOUT.heart)}</p>
        </div>
      </section>

      <section class="about-section" aria-labelledby="about-credits">
        <h2 id="about-credits" class="about-h2">
          {tsh('aboutCredits')}
        </h2>
        <dl class="about-refs">
          <Ref title={tsh('aboutBook')}>
            <p>{lt(ABOUT.book)}</p>
            <p class="about-cite" lang="es">
              {CITATIONS.book}
            </p>
            <p class="about-small">{tsh('aboutBookUse')}</p>
          </Ref>
          <Ref title={tsh('aboutData')}>
            <p class="about-cite" lang="en">
              {CITATIONS.ptbxl}
            </p>
            <p class="about-cite" lang="en">
              {CITATIONS.ptbxlPlus}
            </p>
            <p class="about-cite" lang="en">
              {CITATIONS.physionet}
            </p>
            <p>{lt(ABOUT.dataLicence)}</p>
            <p class="about-links">
              <ExtLink href={LINKS.ptbxl}>PTB-XL 1.0.3 · {tsh('aboutLinkDataset')}</ExtLink>
              <ExtLink href={LINKS.ptbxlPlus}>PTB-XL+ 1.0.1 · {tsh('aboutLinkDataset')}</ExtLink>
              <ExtLink href={LINKS.ccBy}>CC BY 4.0 · {tsh('aboutLinkLicence')}</ExtLink>
            </p>
          </Ref>
          <Ref title={tsh('aboutModels')}>
            <p class="about-cite" lang="en">
              {CITATIONS.hra}
            </p>
            {LAB_MODEL_CREDITS.map((c) => (
              <p class="about-cite" lang="en">
                {c}
              </p>
            ))}
            <p class="about-links">
              <ExtLink href={LINKS.hra}>HRA · {tsh('aboutLinkModel')}</ExtLink>
              <ExtLink href={LINKS.ccBy}>CC BY 4.0 · {tsh('aboutLinkLicence')}</ExtLink>
            </p>
          </Ref>
          <Ref title={tsh('aboutSoftware')}>
            <p>{lt(ABOUT.software)}</p>
          </Ref>
        </dl>
      </section>

      <section class="about-section" aria-labelledby="about-disclaimer">
        <div class="about-callout" role="note">
          <h2 id="about-disclaimer" class="about-callout__title">
            <Icon name="flag" />
            {tsh('aboutDisclaimer')}
          </h2>
          <p>{lt(ABOUT.disclaimer)}</p>
        </div>
      </section>

      <section class="about-section" aria-labelledby="about-privacy">
        <h2 id="about-privacy" class="about-h2">
          {tsh('aboutPrivacy')}
        </h2>
        <p class="about-prose">{lt(ABOUT.privacy)}</p>
      </section>
    </div>
  );
}

function Ref(props: { readonly title: string; readonly children?: ComponentChildren }) {
  return (
    <div class="about-ref">
      <dt>{props.title}</dt>
      <dd>{props.children}</dd>
    </div>
  );
}

function ExtLink(props: { readonly href: string; readonly children?: ComponentChildren }) {
  return (
    <a class="about-ext" href={props.href} target="_blank" rel="noopener noreferrer">
      {props.children}
      <Icon name="external" size={14} />
      <span class="app-sr">{tsh('aboutNewTab')}</span>
    </a>
  );
}

/**
 * The one-source rule as a picture: one cardiac source → one lead system → all 12 leads. Boxes and arrows only (no
 * waveforms), so it stays a diagram of the method, not an ECG.
 */
function OneSourceDiagram() {
  const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  return (
    <svg class="about-diagram" viewBox="0 0 320 80" role="img" aria-label={tsh('aboutDiagAria')}>
      <defs>
        <marker id="about-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L8 4L0 8z" class="about-diagram__head" />
        </marker>
      </defs>
      {/* one cardiac source: a heart vector */}
      <rect class="about-diagram__box" x="2" y="10" width="74" height="40" rx="7" />
      <path class="about-diagram__vec" d="M24 42 L54 18" marker-end="url(#about-arrow)" />
      <text class="about-diagram__label" x="39" y="70" text-anchor="middle">
        {tsh('aboutDiagSource')}
      </text>
      <path class="about-diagram__link" d="M80 30 H104" marker-end="url(#about-arrow)" />
      {/* one lead system: the Einthoven triangle */}
      <rect class="about-diagram__box" x="108" y="10" width="74" height="40" rx="7" />
      <path class="about-diagram__tri" d="M128 19 H162 L145 43 Z" />
      <text class="about-diagram__label" x="145" y="70" text-anchor="middle">
        {tsh('aboutDiagLeads')}
      </text>
      <path class="about-diagram__link" d="M186 30 H210" marker-end="url(#about-arrow)" />
      {leads.map((name, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <g class="about-diagram__lead">
            <rect x={214 + col * 26} y={4 + row * 18} width="24" height="16" rx="3" />
            <text x={226 + col * 26} y={15.5 + row * 18} text-anchor="middle">
              {name}
            </text>
          </g>
        );
      })}
      <text class="about-diagram__label" x="265" y="70" text-anchor="middle">
        {tsh('aboutDiag12')}
      </text>
    </svg>
  );
}
