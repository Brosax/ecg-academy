/**
 * Public surface of src/app for the router switch (docs/PLAN.md §12) and for other modules.
 * Not exported here: App / Outlet (main.tsx imports App directly; the router switch views.tsx imports this file, so
 * re-exporting them would create an import cycle).
 */
export { HomePage } from './HomePage';
export { SettingsPage } from './SettingsPage';
export { AboutPage } from './AboutPage';
export { NotFoundPage } from './NotFoundPage';

/** Places in the shell that feature modules fill (wired in src/main.tsx). */
export { assistantSettingsSlot, assistantSlot, homeSlots, overallProgress, progressDataSlot } from './slots';
