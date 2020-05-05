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

type D3SVGSelection = d3.Selection<SVGSVGElement, any, null, undefined>;

function getNodeIntent(node: ProvenanceNode): string {
  if (
    isStateNode(node) &&
    node.action &&
    node.action.metadata &&
    node.action.metadata.userIntent
  ) {
    return node.action.metadata.userIntent;
  }
  return 'none';
}

function isKeyNode(node: ProvenanceNode): boolean {
  if (
    !isStateNode(node) ||
    node.children.length === 0 ||
    node.children.length > 1 ||
    node.parent.children.length > 1 ||
    (node.children.length === 1 &&
      getNodeIntent(node) !== getNodeIntent(node.children[0]))
  ) {
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
export const testUserIntent: NodeGroupTest<ProvenanceNode> = (a, b) =>
  a.children.length === 1 &&
  getNodeIntent(a.wrappedNodes[0]) === getNodeIntent(b.wrappedNodes[0]);

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
    // change size and distance between nodes here
    const treeLayout = gratzl<IGroupedTreeNode<ProvenanceNode>>().size([
      100 / 2,
      100,
    ]);

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
      .data(treeNodes, (d: any) =>
        d.data.wrappedNodes.map((n: any) => n.id).join(),
      );

    oldNodes.exit().remove();

    const newNodes = oldNodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y}, ${d.x})`)
      .on('click', (d) => this.traverser.toStateNode(d.data.wrappedNodes[0].id));

    newNodes.append('circle').attr('r', 4);

    // newNodes
    //   .append('text')
    //   .text((d) => groupNodeLabel(d.data))
    //   .attr('style', 'font-size: 5px')
    //   .attr('x', -20)
    //   .attr('y', 8);

    // tslint:disable-next-line:no-debugger
    debugger
    const updateNodes = newNodes.merge(oldNodes as any);

    updateNodes.select('circle').attr('class', (d: any) => {
      let classString = '';
      if (isKeyNode(d.data.wrappedNodes[0])) {
        classString += ' keynode';
      }
      classString += ' intent_' + getNodeIntent(d.data.wrappedNodes[0]);

      return classString;
    });

    updateNodes.select('text').attr('visibility', (d: any) => {
      if (d.xOffset === 0) {
        return 'visible';
      } else {
        return 'hidden';
      }
    });

    updateNodes
      .filter((d: any) => d.xOffset === 0)
      .attr('class', 'node branch-active')
      .filter((d: any) =>
        d.data.wrappedNodes.includes(this.traverser.graph.current),
      )
      .attr('class', 'node branch-active node-active');

    updateNodes
      .transition()
      .duration(500)
      .attr('transform', (d: any) => `translate(${d.y}, ${d.x})`);

    const linkPath = ({
      source,
      target,
    }: {
      source: HierarchyPointNode<IGroupedTreeNode<ProvenanceNode>>;
      target: HierarchyPointNode<IGroupedTreeNode<ProvenanceNode>>;
    }) => {
      const [s, t] = [source, target];
      // // tslint:disable-next-line
      // return `M${s.x},${s.y}C${s.x},${(s.y + t.y) / 2} ${t.x},${(s.y + t.y) /
      //   2} ${t.x},${t.y}`;
      return `M${s.y},${s.x}C${s.y},${(s.x + t.x) / 2} ${t.y},${(s.x + t.x) /
      2} ${t.y},${t.x}`;
    };

    const oldLinks = this.svg
      .selectAll('path.link')
      .data(tree.links(), (d: any) =>
        d.target.data.wrappedNodes.map((n: any) => n.id).join(),
      );

    oldLinks.exit().remove();

    const newLinks = oldLinks.enter().append('g');

    newLinks.insert('text').attr('fill', 'Black')
      .style('font', 'normal 4px Arial')
      .attr('transform', (d) => {
        return 'translate(' +
          ((d.source.y + d.target.y) / 2) + ',' +
          ((d.source.x + d.target.x) / 2) + ')';
      })
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text((d) => {
        // tslint:disable-next-line:no-console
        console.log(groupNodeLabel(d.target.data));
        return groupNodeLabel(d.target.data).substring(0, 2);
      });

    // tslint:disable-next-line:no-debugger
    debugger
    newLinks.insert('path', 'g')
      .attr('d', linkPath)
      .attr('stroke-width', '1.2' )
      .attr('stroke', (d) => {
        switch (groupNodeLabel(d.target.data)) {
          case 'addCell':
            return 'green';
            break;
          case 'executeCell':
            return 'blue';
          default:
            return 'pink';
        }
      });

    oldLinks
      .merge(newLinks as any)
      .attr('class', 'link')
      .filter((d: any) => d.target.xOffset === 0)
      .attr('class', 'link active');

    oldLinks
      .merge(newLinks as any)
      .transition()
      .duration(500)
      .attr('d', linkPath);
  }
}
