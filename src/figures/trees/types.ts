/**
 * Decision trees (step-by-step reading algorithms). A tree is data: question nodes with answer options pointing to the
 * next node, and leaf nodes with a conclusion. Nodes may be shared (a DAG, never a cycle). All text is inline L10n so a
 * reviewer sees zh / en / es together; medical sources are cited in a comment at the head of each tree file.
 */
import type { FindingId } from '../../core/findings';
import type { L10n } from '../../core/l10n';
import type { FigureParams } from '../api';

export type TreeId = FigureParams['decision-tree']['tree'];

export interface TreeOption {
  readonly label: L10n;
  readonly next: string;
}

export interface QuestionNode {
  readonly kind: 'question';
  readonly text: L10n;
  /** how to look for it on the tracing */
  readonly help?: L10n;
  readonly options: readonly TreeOption[];
}

/** critical = act now; major = clinically important; minor = descriptive; normal = normal / variant */
export type LeafTone = 'critical' | 'major' | 'minor' | 'normal';

export interface LeafNode {
  readonly kind: 'leaf';
  readonly title: L10n;
  readonly text: L10n;
  readonly tone: LeafTone;
  /** findings in the shared taxonomy (links to the atlas) */
  readonly findings?: readonly FindingId[];
}

export type TreeNode = QuestionNode | LeafNode;

export interface DecisionTree {
  readonly id: TreeId;
  readonly title: L10n;
  readonly intro: L10n;
  readonly root: string;
  readonly nodes: Readonly<Record<string, TreeNode>>;
  /** short references shown under the tree */
  readonly sources: readonly string[];
}
