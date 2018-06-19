import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';

function depthSort(a: IHierarchyPointNodeWithMaxDepth<any>, b: IHierarchyPointNodeWithMaxDepth<any>) {
  if (a.maxDescendantDepth > b.maxDescendantDepth) {
    return -1;
  } else if (a.maxDescendantDepth < b.maxDescendantDepth) {
    return 1;
  }
  return 0;
}

export interface IGratzlLayout<Datum> {
  (
    root: HierarchyNode<Datum>,
    activeNode: HierarchyNode<Datum>,
  ): IHierarchyPointNodeWithMaxDepth<Datum>;
  size?(): [number, number];
  size?(size: [number, number]): this;
}

export interface IHierarchyPointNodeWithMaxDepth<Datum> extends HierarchyPointNode<Datum> {
  maxDescendantDepth: number | undefined;
  parent: IHierarchyPointNodeWithMaxDepth<Datum>;
  ancestors(): Array<IHierarchyPointNodeWithMaxDepth<Datum>>;
  leaves(): Array<IHierarchyPointNodeWithMaxDepth<Datum>>;
  each(callback: (node: IHierarchyPointNodeWithMaxDepth<Datum>) => any): any;
}

export default function<Datum>(): IGratzlLayout<Datum> {
  let dx = 5;
  let dy = 50;
  const widths: number[] = [];

  function setTreeX(node: IHierarchyPointNodeWithMaxDepth<Datum>, val: number) {
    node.x = val;
    widths[node.depth] = val;
    if (node.children) {
      node.leaves().sort(depthSort).forEach((leaf) => {
        if (typeof leaf.x === 'undefined') {
          const width = Math.max.apply(null, widths.slice(node.depth, leaf.depth+1));
          setTreeX(leaf, val > width ? val : width + 1);
        }
      });
    }

    if (node.parent && typeof node.parent.x === 'undefined') {
      setTreeX(node.parent, val);
    }
  }

  const tree: IGratzlLayout<Datum> = (_root, _activeNode) => {
    /*
    * set maxDescendantDepth on each node,
    * which is the depth of its deepest child
    *
    * */

    const root: IHierarchyPointNodeWithMaxDepth<Datum> = _root as IHierarchyPointNodeWithMaxDepth<Datum>;
    const activeNode = _activeNode as IHierarchyPointNodeWithMaxDepth<Datum>;

    root.leaves().forEach((leaf) => {
      leaf.ancestors().forEach((leafAncestor) => {
        if (!leafAncestor.maxDescendantDepth || leaf.depth > leafAncestor.maxDescendantDepth) {
          leafAncestor.maxDescendantDepth = leaf.depth;
        }
      });
    });

    /* rendering should start at the deepest leaf of activeNode. */
    let deepestLeaf = activeNode;
    activeNode.leaves().forEach((leaf) => {
      if (deepestLeaf.depth < leaf.depth) {
        deepestLeaf = leaf;
      }
    });

    setTreeX(deepestLeaf, 0);

    const maxX = Math.max.apply(null, widths);
    const maxY = Math.max.apply(null, root.leaves().map((leaf) => leaf.depth));
    root.each((node) => {
      sizeNode(node, maxX, maxY);
    });

    return root;
  };

  (tree.size as any) = (x: [number, number] | undefined) => {
    return x ? (dx = +x[0], dy = +x[1], tree) : [dx, dy];
  };

  function sizeNode(node: IHierarchyPointNodeWithMaxDepth<any>, maxX: number, maxY: number): void {
    node.x = dx - (dx / maxX) * node.x;
    node.y = (dy / maxY) * node.depth;
  }

  return tree;
}
