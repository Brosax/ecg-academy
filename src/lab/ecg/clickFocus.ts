/**
 * "Click a trace → the heart freezes at that instant": pause, seek, (select the lead) and highlight the structures
 * responsible. Shared by Ecg12View and StripView. The highlight is remembered by reference so that, when playback
 * resumes, the view clears only the highlight it set itself — the guided tour and the disease scenarios write the same
 * store.highlight and must keep theirs (docs/borrow-list-ecg-conduction-lab.md, P0 #1–#2).
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import type { LeadName, SimEngine, StructureId } from '../sim/types';

/** Structures carrying ≥ 50 % of the activity at an instant, at most four (what the 3D heart highlights on a click). */
export function pickResponsible(list: readonly { readonly id: StructureId; readonly w: number }[]): StructureId[] {
  return list.filter((r) => r.w >= 0.5).slice(0, 4).map((r) => r.id);
}

export class ClickFocus {
  /** The highlight array this view handed to commands.highlight, while it may still be the active one. */
  private own: readonly StructureId[] | null = null;
  private readonly unsubscribe: () => void;

  constructor(private readonly commands: AppCommands, private readonly engine: Pick<SimEngine, 'responsible'>) {
    // subscribe() runs the callback once immediately with the current value; edge-detect so only a real resume counts.
    let prev = store.playing.peek();
    this.unsubscribe = store.playing.subscribe((playing) => {
      const resumed = playing && !prev;
      prev = playing;
      if (!resumed || !this.own) return;
      if (store.highlight.peek() === this.own) this.commands.clearHighlight();
      this.own = null;
    });
  }

  /** Pause first so the 3D heart stays at the clicked instant, then seek, select and highlight. */
  focus(tMs: number, lead?: LeadName): void {
    this.commands.pause();
    this.commands.seek(tMs);
    if (lead) this.commands.selectLead(lead);
    const ids = pickResponsible(this.engine.responsible(tMs));
    this.commands.highlight(ids);
    this.own = ids;
  }

  dispose(): void {
    this.unsubscribe();
  }
}
