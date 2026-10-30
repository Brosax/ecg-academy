import { bradyAvBlockTree } from './bradyAvBlock';
import { bundleBranchTree } from './bundleBranch';
import { narrowTachyTree } from './narrowTachy';
import { stElevationTree } from './stElevation';
import type { DecisionTree, TreeId } from './types';
import { wideTachyTree } from './wideTachy';

export type { DecisionTree, LeafNode, LeafTone, QuestionNode, TreeId, TreeNode, TreeOption } from './types';
export { depthOf, leavesOf, validateTree } from './validate';

export const TREES: Readonly<Record<TreeId, DecisionTree>> = {
  'narrow-tachy': narrowTachyTree,
  'wide-tachy': wideTachyTree,
  'brady-av-block': bradyAvBlockTree,
  'st-elevation': stElevationTree,
  'bundle-branch': bundleBranchTree,
};

export const TREE_IDS = Object.keys(TREES) as TreeId[];
