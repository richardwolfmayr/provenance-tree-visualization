import { IGroupedTreeNode } from './tree';

export type NodeGroupTest<T> =
  (a: IGroupedTreeNode<T>, b: IGroupedTreeNode<T>) => boolean;

export const group = <T>(node: IGroupedTreeNode<T>, test: NodeGroupTest<T>) => {
  let merged = false;
  do {
    merged = false;
    for (const child of node.children) {
      if (test(node, child)) {
        node.children.splice(node.children.indexOf(child), 1);
        node.children.push(...child.children);
        node.wrappedNodes.push(...child.wrappedNodes);
        merged = true;
        break;
      }
    }
  } while (merged);
  node.children.map((child) => group(child, test));
};
