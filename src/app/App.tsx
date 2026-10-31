/**
 * Application shell: skip link, header (brand, main navigation, progress entry, language, theme), the page outlet, a
 * footer with the disclaimer and data attribution, and — at ≤ 760 px — a compact header with a menu plus a bottom tab
 * bar. Layout and styles: shell.css (theme tokens only).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { LANG_OPTIONS } from '../i18n';
import { tc } from '../i18n/common';
import { tsh } from '../i18n/shell';
import { Icon, ProgressRing, Segmented } from '../ui';
import type { Lang } from '../core/l10n';
import { focusPageHeading, Outlet } from './Outlet';
import { href, route } from './router';
import { BRAND, brandSubtitle, HEADER_NAV, MENU_NAV, pageKey, SECTIONS, sectionOf, TAB_NAV, type SectionId } from './routes';
import { assistantSlot, overallProgress } from './slots';
import { store } from './store';
import './shell.css';

/** Phone layout (compact header, menu, bottom tab bar) up to this width; keep in sync with shell.css. */
const PHONE_MAX_PX = 760;

export function App() {
  const isLab = route.value.name === 'lab';
  return (
    <div class={isLab ? 'app app--lab' : 'app'}>
      <SkipLink />
      <Header />
      <main id="main" class="app-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <TabBar />
      <AssistantSlot />
    </div>
  );
}

/** SLOT assistantSlot: the AI study assistant's floating dock (src/assistant); nothing until a module plugs it in. */
function AssistantSlot() {
  const Dock = assistantSlot.value;
  return Dock ? <Dock /> : null;
}

/** A hash link would be read by the router as a route, so the skip link moves focus itself. */
function SkipLink() {
  return (
    <a
      class="app-skip"
      href="#main"
      onClick={(e) => {
        e.preventDefault();
        focusPageHeading();
      }}
    >
      {tsh('skipToContent')}
    </a>
  );
}

export function htmlLang(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : lang;
}

function Logo() {
  return (
    <svg class="app-logo" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect class="app-logo__tile" x="0" y="0" width="30" height="30" rx="7" />
      <path class="app-logo__grid" d="M10 3v24M20 3v24M3 10h24M3 20h24" />
      <path class="app-logo__trace" d="M3 17h6l1.6-3 1.8 3h1.2l1.4 4 2.4-15 2.2 13 1.2-2h1.6l1.6-2.5 1.6 2.5H27" />
    </svg>
  );
}

function Brand(props: { readonly compact?: boolean }) {
  const sub = brandSubtitle(store.lang.value);
  return (
    <a class="app-brand" href="#/" aria-label={tsh('brandHome')}>
      <Logo />
      <span class="app-brand__name">{BRAND}</span>
      {sub && !props.compact && (
        <span class="app-brand__sub" lang={htmlLang(store.lang.value)}>
          {sub}
        </span>
      )}
    </a>
  );
}

function NavLink(props: { readonly id: SectionId; readonly active: SectionId | null; readonly class: string; readonly withIcon?: boolean; readonly onNavigate?: () => void }) {
  const s = SECTIONS[props.id];
  const on = props.active === props.id;
  return (
    <a
      class={`${props.class}${on ? ' is-on' : ''}`}
      href={href(s.route)}
      aria-current={on ? 'page' : undefined}
      onClick={props.onNavigate}
    >
      {props.withIcon && <Icon name={s.icon} size={20} />}
      <span>{tc(s.label)}</span>
    </a>
  );
}

function LangSegmented() {
  return (
    <Segmented<Lang>
      size="sm"
      value={store.lang.value}
      ariaLabel={tc('language')}
      options={LANG_OPTIONS.map((o) => ({ value: o.id, label: <span lang={htmlLang(o.id)}>{o.label}</span> }))}
      onChange={(v) => (store.lang.value = v)}
    />
  );
}

function LangSelect() {
  return (
    <label class="app-langselect">
      <Icon name="globe" size={16} />
      <select
        aria-label={tc('language')}
        value={store.lang.value}
        onChange={(e) => (store.lang.value = (e.currentTarget as HTMLSelectElement).value as Lang)}
      >
        {LANG_OPTIONS.map((o) => (
          <option value={o.id} lang={htmlLang(o.id)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Settings gear, drawn here because the shared `settings` icon reads as a sun next to the theme toggle.
 * Eight teeth around a hub, same stroke style as src/ui Icon.
 */
const GEAR_PATH = (() => {
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  };
  const outline: string[] = [];
  for (let i = 0; i < 8; i++) {
    const c = i * 45;
    outline.push(pt(c - 18, 7), pt(c - 10, 9.6), pt(c + 10, 9.6), pt(c + 18, 7));
  }
  return `M${outline.join('L')}ZM15 12a3 3 0 10-6 0 3 3 0 106 0z`;
})();

function GearIcon() {
  return (
    <svg class="ui-icon" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
      <path d={GEAR_PATH} />
    </svg>
  );
}

function ThemeToggle() {
  const dark = store.theme.value === 'dark';
  const label = dark ? tsh('toLight') : tsh('toDark');
  return (
    <button type="button" class="app-iconbtn" aria-label={label} title={label} onClick={() => (store.theme.value = dark ? 'light' : 'dark')}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

function ProgressEntry(props: { readonly active: boolean }) {
  const p = overallProgress.value;
  const label = tsh('progressEntry');
  return (
    <a class={`app-iconbtn${props.active ? ' is-on' : ''}`} href="#/progress" aria-label={label} title={label} aria-current={props.active ? 'page' : undefined}>
      {p == null ? <Icon name="chart" /> : <ProgressRing value={p} size={26} label={`${label}: ${Math.round(p * 100)}%`} />}
    </a>
  );
}

function Header() {
  const r = route.value;
  const active = sectionOf(r);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const key = pageKey(r);

  // any navigation closes the phone menu
  useEffect(() => {
    setMenuOpen(false);
  }, [key]);

  const settingsLabel = tc('navSettings');
  return (
    <header class="app-header">
      <div class="app-header__inner">
        <Brand />
        <nav class="app-nav" aria-label={tsh('mainNav')}>
          <ul>
            {HEADER_NAV.map((id) => (
              <li>
                <NavLink id={id} active={active} class="app-nav__link" />
              </li>
            ))}
          </ul>
        </nav>
        <div class="app-tools">
          <ProgressEntry active={active === 'progress'} />
          <div class="app-lang app-lang--wide">
            <LangSegmented />
          </div>
          <div class="app-lang app-lang--narrow">
            <LangSelect />
          </div>
          <ThemeToggle />
          <a
            class={`app-iconbtn app-only-wide${active === 'settings' ? ' is-on' : ''}`}
            href="#/settings"
            aria-label={settingsLabel}
            title={settingsLabel}
            aria-current={active === 'settings' ? 'page' : undefined}
          >
            <GearIcon />
          </a>
          <button
            ref={menuBtn}
            type="button"
            class="app-iconbtn app-menubtn"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? 'app-menu' : undefined}
            aria-label={menuOpen ? tsh('menuClose') : tsh('menuOpen')}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'list'} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <PhoneMenu
          active={active}
          onClose={(refocus) => {
            setMenuOpen(false);
            if (refocus) menuBtn.current?.focus();
          }}
          toggle={menuBtn}
        />
      )}
    </header>
  );
}

/** Phone menu (≤ 760 px): every section, language and theme. Esc or a click outside closes it. */
function PhoneMenu(props: { readonly active: SectionId | null; readonly onClose: (refocus: boolean) => void; readonly toggle: { readonly current: HTMLButtonElement | null } }) {
  const panel = useRef<HTMLDivElement>(null);
  // latest callbacks without re-running the mount effect (which would move focus again on every re-render)
  const latest = useRef(props);
  latest.current = props;
  const onClose = (refocus: boolean) => latest.current.onClose(refocus);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('a, button, select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current.onClose(true);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && !panel.current?.contains(t) && !latest.current.toggle.current?.contains(t)) latest.current.onClose(false);
    };
    // the menu exists only on phones: growing past 760 px (rotation, window resize) closes it instead of leaving an
    // invisible open menu that still catches Esc and outside clicks
    const wide = globalThis.matchMedia?.(`(min-width: ${PHONE_MAX_PX + 1}px)`);
    const onWide = () => {
      if (wide?.matches) latest.current.onClose(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    wide?.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      wide?.removeEventListener('change', onWide);
    };
  }, []);

  const dark = store.theme.value === 'dark';
  return (
    <div id="app-menu" class="app-menu" ref={panel}>
      <nav aria-label={tsh('menu')}>
        <ul class="app-menu__list">
          {MENU_NAV.map((id) => (
            <li>
              <NavLink id={id} active={props.active} class="app-menu__link" withIcon onNavigate={() => onClose(false)} />
            </li>
          ))}
        </ul>
      </nav>
      <div class="app-menu__prefs">
        <div class="app-menu__pref">
          <span class="app-menu__label">{tc('language')}</span>
          <LangSegmented />
        </div>
        <div class="app-menu__pref">
          <span class="app-menu__label">{tsh('theme')}</span>
          <Segmented<'light' | 'dark'>
            size="sm"
            value={dark ? 'dark' : 'light'}
            ariaLabel={tsh('theme')}
            options={[
              { value: 'light', label: tc('themeLight') },
              { value: 'dark', label: tc('themeDark') },
            ]}
            onChange={(v) => (store.theme.value = v)}
          />
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const active = sectionOf(route.value);
  return (
    <nav class="app-tabbar" aria-label={tsh('tabNav')}>
      {TAB_NAV.map((id) => (
        <NavLink id={id} active={active} class="app-tab" withIcon />
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <footer class="app-footer">
      <div class="app-footer__inner">
        <p class="app-footer__text">
          <span>{tsh('footerDisclaimer')}</span>
          <span>{tsh('footerData')}</span>
        </p>
        <p class="app-footer__links">
          <a href="#/about">{tsh('footerCredits')}</a>
          <a href="#/settings">{tc('navSettings')}</a>
        </p>
      </div>
    </footer>
  );
}
