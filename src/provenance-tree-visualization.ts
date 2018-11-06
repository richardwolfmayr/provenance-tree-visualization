import * as d3 from 'd3';
import { HierarchyPointNode } from 'd3';
import {
  ProvenanceNode,
  ProvenanceGraphTraverser,
  isStateNode,
} from '@visualstorytelling/provenance-core';

import gratzl from './gratzl';
import { IGroupedTreeNode } from './tree';
import { group, NodeGroupTest } from './grouping';

type D3SVGSelection = d3.Selection<SVGElement, any, null, undefined>;

function getNodeIntent(node: ProvenanceNode): string {
  if (isStateNode(node) && node.action && node.action.metadata && node.action.metadata.userIntent) {
    return node.action.metadata.userIntent;
  }
  return 'none';
}

function isKeyNode(node: ProvenanceNode): boolean {
  if (!isStateNode(node) || node.children.length === 0 || node.children.length > 1 || node.parent.children.length > 1 ||
      (node.children.length === 1 && getNodeIntent(node) !== getNodeIntent(node.children[0]))) {
      return true;
    }
  return false;
}

/* returns a label for grouped nodes */
const groupNodeLabel = (node: IGroupedTreeNode<ProvenanceNode>) => {
  if (node.wrappedNodes.length === 1) {
    return node.wrappedNodes[0].label;
  } else {
    return `group (${node.wrappedNodes.length.toString()})`;
  }
};

/* wraps each node in the provenance tree in an extra IGroupedTreeNode; which can be
   manipulated for grouping etc, without modifying the actual ProvenanceTree.
 */
const wrapNode = (node: ProvenanceNode): IGroupedTreeNode<ProvenanceNode> => {
  return {
    wrappedNodes: [node],
    children: node.children.map(wrapNode),
  };
};

/* this test groups nodes if they share the same userIntent */
export const testUserIntent: NodeGroupTest<ProvenanceNode> = (a, b) => (
  a.children.length === 1 &&
  (getNodeIntent(a.wrappedNodes[0]) === getNodeIntent(b.wrappedNodes[0]))
);

export class ProvenanceTreeVisualization {
  private traverser: ProvenanceGraphTraverser;
  private svg: D3SVGSelection;
  private _groupTest: NodeGroupTest<ProvenanceNode> = testUserIntent;

  constructor(traverser: ProvenanceGraphTraverser, elm: HTMLDivElement) {
    this.traverser = traverser;
    this.svg = (d3.select(elm).append('svg') as D3SVGSelection)
      .attr('viewBox', '-10 -10 130 130')
      .attr('style', 'width: 100%; height: 100%');
    traverser.graph.on('currentChanged', () => this.update());
    this.update();
  }

  public set groupTest(test: NodeGroupTest<ProvenanceNode>) {
    this._groupTest = test;
  }

  public get groupTest() {
    return this._groupTest;
  }

  public update() {
    const wrappedRoot = wrapNode(this.traverser.graph.root);
    // group by userIntent
    group(wrappedRoot, this.groupTest);
    const treeRoot = d3.hierarchy(wrappedRoot);
    const treeLayout = gratzl<IGroupedTreeNode<ProvenanceNode>>().size([100 / 2, 100]);

    let layoutCurrentNode = treeRoot;
    treeRoot.each((node) => {
      if (node.data.wrappedNodes.includes(this.traverser.graph.current)) {
        layoutCurrentNode = node;
      }
    });
    const tree = treeLayout(treeRoot, layoutCurrentNode);
    const treeNodes = tree.descendants();

    const oldNodes = this.svg
      .selectAll('g.node')
      .data(treeNodes, (d: any) => (
        d.data.wrappedNodes.map((n: any) => n.id).join()
      ))
    ;

    oldNodes.exit().remove();

    const newNodes = oldNodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .on('click', (d) => this.traverser.toStateNode(d.data.wrappedNodes[0].id));

    newNodes
      .append('circle')
      .attr('r', 2);

    newNodes
      .append('text')
      .text((d) => groupNodeLabel(d.data))
      .attr('style', 'font-size: 8px')
      .attr('x', 7)
      .attr('y', 3);

    const updateNodes = newNodes.merge(oldNodes);

    updateNodes
      .select('circle')
      .attr('class', (d: any) => {
        let classString = '';
        if (isKeyNode(d.data.wrappedNodes[0])) {
          classString += ' keynode';
        }
        classString += ' intent_' + getNodeIntent(d.data.wrappedNodes[0]);

        return classString;
      });

    updateNodes
      .select('text')
      .attr('visibility', (d: any) => {
        if (d.xOffset === 0) {
          return 'visible';
        } else {
          return 'hidden';
        }
      });

    updateNodes
      .filter((d: any) => d.xOffset === 0)
      .attr('class', 'node branch-active')
      .filter((d: any) => d.data.wrappedNodes.includes(this.traverser.graph.current))
      .attr('class', 'node branch-active node-active');

    updateNodes
      .transition()
      .duration(500)
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

    const linkPath = ({
      source,
      target,
    }: {
      source: HierarchyPointNode<IGroupedTreeNode<ProvenanceNode>>;
      target: HierarchyPointNode<IGroupedTreeNode<ProvenanceNode>>;
    }) => {
      const [s, t] = [source, target];
      // tslint:disable-next-line
      return `M${s.x},${s.y}C${s.x},${(s.y + t.y) / 2} ${t.x},${(s.y + t.y) / 2} ${t.x},${t.y}`;
    };

    const oldLinks = this.svg
      .selectAll('path.link')
      .data(tree.links(), (d: any) => d.target.data.wrappedNodes.map((n: any) => n.id).join());

    oldLinks.exit().remove();

    const newLinks = oldLinks
      .enter()
      .insert('path', 'g')
      .attr('d', linkPath);

    oldLinks.merge(newLinks)
      .attr('class', 'link')
      .filter((d: any) => d.target.xOffset === 0)
      .attr('class', 'link active');

    oldLinks.merge(newLinks)
      .transition()
      .duration(500)
      .attr('d', linkPath);
  }
}
