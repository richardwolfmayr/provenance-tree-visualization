import * as d3 from 'd3';
import { HierarchyPointNode } from 'd3';
import {
  ProvenanceNode,
  ProvenanceGraphTraverser,
  isStateNode,
} from '@visualstorytelling/provenance-core';

import gratzl from './gratzl';

type D3SVGSelection = d3.Selection<SVGElement, any, null, undefined>;

export class ProvenanceTreeVisualization {
  private traverser: ProvenanceGraphTraverser;
  private svg: D3SVGSelection;

  constructor(traverser: ProvenanceGraphTraverser, elm: HTMLDivElement) {
    this.traverser = traverser;
    this.svg = (d3.select(elm).append('svg') as D3SVGSelection)
      .attr('viewBox', '-10 -10 130 130')
      .attr('style', 'width: 100%; height: 100%');
    traverser.graph.on('currentChanged', () => this.update());
    this.update();
  }

  public update() {
    const treeRoot = d3.hierarchy(this.traverser.graph.root);
    const treeLayout = gratzl<ProvenanceNode>().size([100 / 2, 100]);

    let layoutCurrentNode = treeRoot;
    treeRoot.each((node) => {
      if (node.data === this.traverser.graph.current) {
        layoutCurrentNode = node;
      }
    });
    const tree = treeLayout(treeRoot, layoutCurrentNode);
    const treeNodes = tree.descendants();

    const oldNodes = this.svg
      .selectAll('g.node')
      .data(treeNodes, (d: any) => d.data.id as any);

    const newNodes = oldNodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .on('click', (d) => this.traverser.toStateNode(d.data.id));

    newNodes
      .append('circle')
      .attr('r', 2);

    newNodes
      .append('text')
      .text((d) => (isStateNode(d.data) ? d.data.label : ''))
      .attr('style', 'font-size: 8px')
      .attr('x', 7)
      .attr('y', 3);

    newNodes.merge(oldNodes)
      .attr('class', 'node')
      .filter((d: any) => d.xOffset === 0)
      .attr('class', 'node branch-active')
      .filter((d: any) => d.data === this.traverser.graph.current)
      .attr('class', 'node branch-active node-active');

    newNodes.merge(oldNodes)
      .transition()
      .duration(500)
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

    const linkPath = ({
      source,
      target,
    }: {
      source: HierarchyPointNode<ProvenanceNode>;
      target: HierarchyPointNode<ProvenanceNode>;
    }) => {
      const [s, t] = [source, target];
      // tslint:disable-next-line
      return `M${s.x},${s.y}C${s.x},${(s.y + t.y) / 2} ${t.x},${(s.y + t.y) / 2} ${t.x},${t.y}`;
    };

    const oldLinks = this.svg
      .selectAll('path.link')
      .data(tree.links(), (d: any) => d.target.data.id);

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
