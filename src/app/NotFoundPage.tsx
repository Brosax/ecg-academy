/**
 * Not found: says which address was not understood and offers every section of the app as a way back.
 */
import { tc } from '../i18n/common';
import { tsh } from '../i18n/shell';
import { Icon, LinkButton } from '../ui';
import { href } from './router';
import { MENU_NAV, SECTIONS } from './routes';
import './pages.css';

/** Keep the echoed path short so a pasted junk URL cannot blow up the layout. */
export function displayPath(path: string, max = 60): string {
  const p = `/${path.replace(/^\/+/, '')}`;
  return p.length > max ? `${p.slice(0, max - 1)}…` : p;
}

export function NotFoundPage(props: { readonly path: string }) {
  const sections = MENU_NAV.filter((id) => id !== 'home');
  return (
    <div class="app-page nf">
      <header class="app-pagehead">
        <h1>{tc('notFound')}</h1>
        <p>
          {tsh('nfLead', { path: displayPath(props.path) })}
        </p>
      </header>
      <LinkButton href="#/" tone="primary" icon="home">
        {tsh('nfHome')}
      </LinkButton>
      <h2 class="nf-h2">{tsh('nfTry')}</h2>
      <ul class="nf-links">
        {sections.map((id) => {
          const s = SECTIONS[id];
          return (
            <li>
              <a class="nf-link" href={href(s.route)}>
                <Icon name={s.icon} />
                <span>{tc(s.label)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
