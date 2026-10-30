/**
 * Heart Lab — public entry (ECG Academy route `#/lab` and `#/lab/<scenarioId>`).
 *
 * The old "Dynamic Electrocardiogram" app (3D voxel heart + live 12-lead ECG: modes, disease library, blood flow,
 * click-to-freeze, quiz, tour) runs here on its own engine; see src/lab/README.md. The integrator imports only this
 * file: `LabPage`, `labScenarioIds`, `LAB_SCENARIOS`, `labHref`, `LAB_MODEL_CREDITS`.
 *
 * Layout: `.lab-root` fills the viewport below the host header — `100dvh − (var(--app-header-h, 56px) + 1px border)`,
 * minus the phone tab bar at ≤ 760 px (override `--lab-offset-top` if the host changes) — and should be rendered
 * full-bleed (no page padding / max-width around it). All lab CSS is scoped under `.lab-root`.
 * Language and theme follow the host store (src/lab/bridge.ts).
 */
import { useEffect, useState } from 'preact/hooks';
import { App } from './app/App';
import { installHostBridge, syncFromHost } from './bridge';
import { SCENARIOS } from './sim/scenarios/library';

export { LAB_SCENARIOS, labHref } from './links';
/** Attribution lines for the lab's third-party models (HRA heart, vasculature, skin — CC BY 4.0), for the site's About page. */
export { MODEL_CREDITS as LAB_MODEL_CREDITS } from './app/ui/references';

export interface LabPageProps {
  /** Lab scenario id to open in disease mode (see labScenarioIds()); omitted = keep the lab's current state. */
  readonly scenario?: string;
}

export function LabPage({ scenario }: LabPageProps) {
  // before the first lab render: copy the host's language and theme, so the first frame is already right
  useState(() => {
    syncFromHost();
    return true;
  });
  useEffect(() => installHostBridge(), []);
  return (
    <div class="lab-root">
      <div class="lab-viewport">
        <App scenario={scenario} />
      </div>
    </div>
  );
}

/** Every scenario id the lab can simulate (valid values of `LabPage({ scenario })` and of `#/lab/<id>`). */
export function labScenarioIds(): readonly string[] {
  return Object.keys(SCENARIOS);
}
