export interface IGroupedTreeNode<T> {
  children: Array<IGroupedTreeNode<T>>;
  wrappedNodes: T[];
}

export const copyTree = <T>(node: IGroupedTreeNode<T>): typeof node => {
  return {
    ...node,
    children: node.children.map(copyTree),
  };
};

export const preOrderTraversal = <T>(
  node: IGroupedTreeNode<T>,
  cb: (n: typeof node) => any,
) => {
  cb(node);
  node.children.map((child) => preOrderTraversal(child, cb));
};
